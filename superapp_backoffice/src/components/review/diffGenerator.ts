export interface DiffLine {
  type: 'add' | 'del' | 'normal';
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
  content: string;
}

export interface SplitDiffRow {
  left: {
    lineNumber: number | null;
    content: string;
    type: 'del' | 'normal' | 'empty';
  };
  right: {
    lineNumber: number | null;
    content: string;
    type: 'add' | 'normal' | 'empty';
  };
}

export interface ReviewDiffFile {
  id: string;
  filename: string;
  path: string;
  language: 'json' | 'yaml';
  status: 'modified' | 'added' | 'deleted' | 'unchanged';
  additions: number;
  deletions: number;
  unifiedLines: DiffLine[];
  splitRows: SplitDiffRow[];
}

/**
 * Computes an LCS-based line diff between two text representations.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const n = oldLines.length;
  const m = newLines.length;

  // Build DP table for Longest Common Subsequence
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: 'normal',
        oldLineNumber: i,
        newLineNumber: j,
        content: oldLines[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: 'add',
        oldLineNumber: null,
        newLineNumber: j,
        content: newLines[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({
        type: 'del',
        oldLineNumber: i,
        newLineNumber: null,
        content: oldLines[i - 1],
      });
      i--;
    }
  }

  return result;
}

/**
 * Builds side-by-side rows from unified diff lines for Split View.
 */
export function buildSplitRows(unifiedLines: DiffLine[]): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let idx = 0;

  while (idx < unifiedLines.length) {
    const line = unifiedLines[idx];

    if (line.type === 'normal') {
      rows.push({
        left: {
          lineNumber: line.oldLineNumber ?? null,
          content: line.content,
          type: 'normal',
        },
        right: {
          lineNumber: line.newLineNumber ?? null,
          content: line.content,
          type: 'normal',
        },
      });
      idx++;
    } else if (line.type === 'del') {
      // Collect contiguous deletes
      const dels: DiffLine[] = [];
      while (idx < unifiedLines.length && unifiedLines[idx].type === 'del') {
        dels.push(unifiedLines[idx]);
        idx++;
      }
      // Collect contiguous adds right after
      const adds: DiffLine[] = [];
      while (idx < unifiedLines.length && unifiedLines[idx].type === 'add') {
        adds.push(unifiedLines[idx]);
        idx++;
      }

      const maxLen = Math.max(dels.length, adds.length);
      for (let k = 0; k < maxLen; k++) {
        const d = dels[k];
        const a = adds[k];
        rows.push({
          left: d
            ? { lineNumber: d.oldLineNumber ?? null, content: d.content, type: 'del' }
            : { lineNumber: null, content: '', type: 'empty' },
          right: a
            ? { lineNumber: a.newLineNumber ?? null, content: a.content, type: 'add' }
            : { lineNumber: null, content: '', type: 'empty' },
        });
      }
    } else {
      // Single add without preceding del
      rows.push({
        left: { lineNumber: null, content: '', type: 'empty' },
        right: {
          lineNumber: line.newLineNumber ?? null,
          content: line.content,
          type: 'add',
        },
      });
      idx++;
    }
  }

  return rows;
}

/**
 * Synthesizes reviewable manifest files based on diffData and miniApp records.
 */
export function generateReviewDiffFiles(
  diffData: any,
  miniApp: any,
): { files: ReviewDiffFile[]; totalAdditions: number; totalDeletions: number } {
  if (!diffData) {
    return { files: [], totalAdditions: 0, totalDeletions: 0 };
  }

  const d = diffData.differences || {};
  const isFlutter =
    miniApp?.integrationMethod === 'FLUTTER_PACKAGE' ||
    diffData.integration?.method?.target === 'FLUTTER_PACKAGE';

  const files: ReviewDiffFile[] = [];

  // Helper to construct a file from old and new text
  const addFile = (id: string, filename: string, path: string, language: 'json' | 'yaml', oldText: string, newText: string) => {
    const lines = computeLineDiff(oldText, newText);
    const additions = lines.filter((l) => l.type === 'add').length;
    const deletions = lines.filter((l) => l.type === 'del').length;
    const splitRows = buildSplitRows(lines);
    const status =
      additions > 0 && deletions > 0
        ? 'modified'
        : additions > 0
        ? 'added'
        : deletions > 0
        ? 'deleted'
        : 'unchanged';

    files.push({
      id,
      filename,
      path,
      language,
      status,
      additions,
      deletions,
      unifiedLines: lines,
      splitRows,
    });
  };

  // 1. Root Manifest (miniapp.manifest.json)
  const baseManifest = {
    appId: diffData.appId || miniApp?.appId || 'unknown.miniapp',
    name: d.metadata?.name?.base || diffData.appName || miniApp?.name,
    version: diffData.baseVersion?.version || '1.0.0',
    integrationMethod: d.integration?.method?.base || miniApp?.integrationMethod || 'WEBVIEW',
    description: d.metadata?.shortDescription?.base || miniApp?.shortDescription || '',
    homeWidget: d.metadata?.homeWidget?.base || (miniApp?.homeWidget ? miniApp.homeWidget : null),
    status: diffData.baseVersion?.status || 'ACTIVE',
  };

  const targetManifest = {
    appId: diffData.appId || miniApp?.appId || 'unknown.miniapp',
    name: d.metadata?.name?.target || diffData.appName || miniApp?.name,
    version: diffData.targetVersion?.version || 'v1.1.0-draft',
    integrationMethod: d.integration?.method?.target || miniApp?.integrationMethod || 'WEBVIEW',
    description: d.metadata?.shortDescription?.target || miniApp?.shortDescription || '',
    homeWidget: d.metadata?.homeWidget?.target || (miniApp?.homeWidget ? miniApp.homeWidget : null),
    status: diffData.targetVersion?.status || 'IN_REVIEW',
  };

  addFile(
    'manifest',
    'miniapp.manifest.json',
    'miniapp.manifest.json',
    'json',
    JSON.stringify(baseManifest, null, 2),
    JSON.stringify(targetManifest, null, 2),
  );

  // 2. Flutter pubspec.yaml (if flutter package)
  if (isFlutter) {
    const pkgName =
      d.integration?.flutterPackageName?.target ||
      miniApp?.integrationConfigFlutter?.packageName ||
      miniApp?.packageName ||
      'mini_app_package';
    const baseConstraint = d.integration?.flutterVersionConstraint?.base || '^1.0.0';
    const targetConstraint = d.integration?.flutterVersionConstraint?.target || '^1.1.0';

    const basePubspec = [
      `name: ${pkgName}`,
      `description: ${d.metadata?.shortDescription?.base || miniApp?.shortDescription || 'SuperApp MiniApp Module'}`,
      `version: ${diffData.baseVersion?.version || '1.0.0'}`,
      `publish_to: "https://nexus.fintechcenterfsa.com/repository/superapp-pub-hosted/"`,
      ``,
      `environment:`,
      `  sdk: ">=3.2.0 <4.0.0"`,
      `  flutter: ">=3.19.0"`,
      ``,
      `dependencies:`,
      `  flutter:`,
      `    sdk: flutter`,
      `  superapp_sdk: ${baseConstraint}`,
      `  http: ^1.2.0`,
      ``,
      `flutter:`,
      `  uses-material-design: true`,
    ].join('\n');

    const targetPubspec = [
      `name: ${pkgName}`,
      `description: ${d.metadata?.shortDescription?.target || miniApp?.shortDescription || 'SuperApp MiniApp Module'}`,
      `version: ${diffData.targetVersion?.version || '1.1.0'}`,
      `publish_to: "https://nexus.fintechcenterfsa.com/repository/superapp-pub-hosted/"`,
      ``,
      `environment:`,
      `  sdk: ">=3.2.0 <4.0.0"`,
      `  flutter: ">=3.19.0"`,
      ``,
      `dependencies:`,
      `  flutter:`,
      `    sdk: flutter`,
      `  superapp_sdk: ${targetConstraint}`,
      `  http: ^1.2.0`,
      ...(d.permissions?.added?.some((p: any) => p.type === 'BIOMETRIC_AUTH') ? [`  local_auth: ^2.1.8`] : []),
      ...(d.permissions?.added?.some((p: any) => p.type === 'CAMERA') ? [`  camera: ^0.10.5`] : []),
      ``,
      `flutter:`,
      `  uses-material-design: true`,
    ].join('\n');

    addFile('pubspec', 'pubspec.yaml', 'pubspec.yaml', 'yaml', basePubspec, targetPubspec);
  }

  // 3. Permissions manifest (config/permissions.json)
  const basePerms = [
    ...(d.permissions?.unchanged || []),
    ...(d.permissions?.removed || []),
    ...(d.permissions?.modified?.map((m: any) => ({ type: m.type, purpose: m.oldPurpose })) || []),
  ].map((p: any) => ({
    type: p.type,
    purpose: p.purpose || 'MiniApp capability access',
    riskLevel: p.riskLevel || 'LOW',
  }));

  const targetPerms = [
    ...(d.permissions?.unchanged || []),
    ...(d.permissions?.added || []),
    ...(d.permissions?.modified?.map((m: any) => ({ type: m.type, purpose: m.newPurpose })) || []),
  ].map((p: any) => ({
    type: p.type,
    purpose: p.purpose || 'MiniApp capability access',
    riskLevel: p.riskLevel || (p.type?.includes('AUTH') || p.type?.includes('CAMERA') ? 'HIGH' : 'LOW'),
  }));

  addFile(
    'permissions',
    'permissions.json',
    'config/permissions.json',
    'json',
    JSON.stringify({ capabilities: basePerms }, null, 2),
    JSON.stringify({ capabilities: targetPerms }, null, 2),
  );

  // 4. Network Security & Endpoints (config/network-security.json)
  const baseAllowed = [
    ...(d.integration?.allowedDomains?.unchanged || []),
    ...(d.integration?.allowedDomains?.removed || []),
  ];
  const targetAllowed = [
    ...(d.integration?.allowedDomains?.unchanged || []),
    ...(d.integration?.allowedDomains?.added || []),
  ];

  const baseNetwork = {
    productionUrl: d.integration?.productionUrl?.base || miniApp?.integrationConfig?.productionUrl || 'https://api.fintechcenterfsa.com',
    stagingUrl: d.integration?.stagingUrl?.base || miniApp?.integrationConfig?.stagingUrl || 'https://staging.fintechcenterfsa.com',
    allowedDomains: baseAllowed.length > 0 ? baseAllowed : ['api.fintechcenterfsa.com'],
    enforceHttps: true,
    domainVerified: Boolean(d.security?.domainVerification?.base),
  };

  const targetNetwork = {
    productionUrl: d.integration?.productionUrl?.target || d.integration?.productionUrl?.base || miniApp?.integrationConfig?.productionUrl || 'https://api.fintechcenterfsa.com',
    stagingUrl: d.integration?.stagingUrl?.target || d.integration?.stagingUrl?.base || miniApp?.integrationConfig?.stagingUrl || 'https://staging.fintechcenterfsa.com',
    allowedDomains: targetAllowed.length > 0 ? targetAllowed : ['api.fintechcenterfsa.com'],
    enforceHttps: true,
    domainVerified: Boolean(d.security?.domainVerification?.target),
  };

  addFile(
    'network',
    'network-security.json',
    'config/network-security.json',
    'json',
    JSON.stringify(baseNetwork, null, 2),
    JSON.stringify(targetNetwork, null, 2),
  );

  // 5. Legal & Metadata (config/legal-metadata.json)
  const baseLegal = {
    privacyPolicyUrl: d.metadata?.privacyPolicyUrl?.base || miniApp?.privacyPolicyUrl || 'https://fintechcenterfsa.com/privacy',
    termsUrl: d.metadata?.termsUrl?.base || miniApp?.termsUrl || 'https://fintechcenterfsa.com/terms',
    supportEmail: d.metadata?.supportEmail?.base || miniApp?.supportEmail || 'support@fintechcenterfsa.com',
    teamName: d.metadata?.teamName?.base || miniApp?.teamName || '',
    homeWidget: d.metadata?.homeWidget?.base || (miniApp?.homeWidget ? miniApp.homeWidget : null),
  };

  const targetLegal = {
    privacyPolicyUrl: d.metadata?.privacyPolicyUrl?.target || d.metadata?.privacyPolicyUrl?.base || miniApp?.privacyPolicyUrl || 'https://fintechcenterfsa.com/privacy',
    termsUrl: d.metadata?.termsUrl?.target || d.metadata?.termsUrl?.base || miniApp?.termsUrl || 'https://fintechcenterfsa.com/terms',
    supportEmail: d.metadata?.supportEmail?.target || d.metadata?.supportEmail?.base || miniApp?.supportEmail || 'support@fintechcenterfsa.com',
    teamName: d.metadata?.teamName?.target || d.metadata?.teamName?.base || miniApp?.teamName || '',
    homeWidget: d.metadata?.homeWidget?.target || (miniApp?.homeWidget ? miniApp.homeWidget : null),
  };

  addFile(
    'legal',
    'legal-metadata.json',
    'config/legal-metadata.json',
    'json',
    JSON.stringify(baseLegal, null, 2),
    JSON.stringify(targetLegal, null, 2),
  );

  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  return { files, totalAdditions, totalDeletions };
}
