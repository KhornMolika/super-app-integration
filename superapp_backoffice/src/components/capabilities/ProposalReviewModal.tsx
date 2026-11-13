import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/inputs';
import {
  Smartphone,
  User,
  X,
  Tag,
  Check,
  Copy,
  ExternalLink,
  Globe,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileCode,
  Info,
  RotateCcw,
  ChevronDown,
  Loader2,
  Lightbulb,
  ClipboardList,
} from 'lucide-react';
import {
  CodeChange,
  CodePreview,
  KeySuggestion,
  MIN_REJECT_REASON_LENGTH,
  PermissionProposal,
  permissionsApi,
} from '@/api/permissions.api';
import { ProposalProgress } from '@/components/capabilities/ProposalProgress';
import { superAppApi } from '@/api/super-app.api';
import { getCapabilityVisual } from '@/lib/capability-visuals';
import { copyText } from '@/lib/clipboard';

interface ProposalReviewModalProps {
  proposal: PermissionProposal | null;
  onClose: () => void;
  /** Approves; resolves with the code-change outcome so the modal can show it. */
  onApprove: (
    proposal: PermissionProposal,
    targetVersion: string,
    targetBranch: string,
  ) => Promise<CodeChange | null | undefined>;
  onReject: (proposal: PermissionProposal, reason: string) => Promise<void>;
  /** Called after a retry so the list can refresh. */
  onChanged?: () => void;
  isSubmitting: boolean;
  /** false: the viewer may reject but not approve (approving is Super Admin only) */
  canApprove?: boolean;
}

type DecisionTab = 'APPROVE' | 'REJECT';

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

const REJECTION_PRESETS = [
  'Duplicate of existing capability',
  'Security & privacy policy concern',
  'Incomplete technical justification',
  'Not supported on current shell architecture',
  'Third-party SDK integration not verified',
];

/** Plain-language name for a Super App file. */
const FILE_LABELS: Record<string, string> = {
  'android/app/src/main/AndroidManifest.xml': 'Android permission',
  'ios/Runner/Info.plist': 'iOS permission message',
  'pubspec.yaml': 'Flutter package',
  'lib/core/miniapp/bridge/capability_handlers.generated.dart': 'Bridge registration',
};

const fileLabel = (f: string) =>
  FILE_LABELS[f] ?? (f.includes('/bridge/handlers/') ? 'Bridge handler to implement' : 'File');

function StatusBadge({ proposal }: { proposal: PermissionProposal }) {
  const codeChange = proposal.metadata?.codeChange;
  let label = 'Waiting for review';
  let tone = 'amber';
  if (proposal.status === 'REJECTED') {
    label = 'Rejected';
    tone = 'slate';
  } else if (proposal.status === 'APPROVED') {
    if (codeChange?.status === 'failed') {
      label = 'Code change failed';
      tone = 'rose';
    } else if (codeChange?.status === 'needs_work') {
      label = 'Waiting for the Super App team';
      tone = 'amber';
    } else if (codeChange?.status === 'created' || proposal.metadata?.mrUrl) {
      label = 'Code change ready';
      tone = 'violet';
    } else {
      label = 'Approved';
      tone = 'emerald';
    }
  } else if (proposal.status === 'IN_DEVELOPMENT') {
    label = 'In development';
    tone = 'violet';
  }
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tones[tone]}`}>
      {label}
    </span>
  );
}

function TaskLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/70 dark:bg-slate-900/60 border border-current/20 hover:bg-white dark:hover:bg-slate-900 transition-colors shrink-0"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      <span>View task</span>
    </a>
  );
}

function StepList({ steps }: { steps?: string[] }) {
  if (!steps?.length) return null;
  return (
    <ul className="space-y-1 pl-1">
      {steps.map((s) => (
        <li key={s} className="flex items-start gap-2 text-[11px] leading-relaxed">
          <span className="mt-1 w-3 h-3 rounded border border-current/40 shrink-0" aria-hidden="true" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

/** Result of the Super App code change, with Retry when it failed. */
function CodeChangeResult({
  codeChange,
  targetVersion,
  retrying,
  onRetry,
}: {
  codeChange: CodeChange | null | undefined;
  targetVersion?: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  if (!codeChange) {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="font-bold">Approved{targetVersion ? ` for release v${targetVersion}` : ''}</span>
      </div>
    );
  }

  if (codeChange.status === 'needs_work') {
    return (
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ClipboardList className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Approved. The Super App team has a task to finish it.</p>
              <p className="text-[11px] mt-0.5 opacity-90">No file had to change automatically; the work below is done by hand.</p>
            </div>
          </div>
          {codeChange.issueUrl && <TaskLink url={codeChange.issueUrl} />}
        </div>
        <StepList steps={codeChange.remainingSteps} />
      </div>
    );
  }

  if (codeChange.status === 'created') {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Code change ready for review</p>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                The Super App team reviews and merges it{targetVersion ? ` for release v${targetVersion}` : ''}.
              </p>
            </div>
          </div>
          {codeChange.mrUrl && (
            <a
              href={codeChange.mrUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View code change</span>
            </a>
          )}
        </div>
        {!!codeChange.filesModified?.length && (
          <ul className="pl-6 space-y-0.5 text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
            {codeChange.filesModified.map((f) => (
              <li key={f}>
                {fileLabel(f)} <span className="font-mono text-[10px] opacity-70">{f}</span>
              </li>
            ))}
          </ul>
        )}
        {!!codeChange.remainingSteps?.length && (
          <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[11px]">Still to do by the Super App team</span>
              {codeChange.issueUrl && <TaskLink url={codeChange.issueUrl} />}
            </div>
            <StepList steps={codeChange.remainingSteps} />
          </div>
        )}
      </div>
    );
  }

  if (codeChange.status === 'not_needed') {
    return (
      <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Approved. No code change was needed.</p>
          {codeChange.message && <p className="text-[11px] mt-0.5 opacity-90">{codeChange.message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-bold">Approved, but the code change could not be prepared</p>
          <p className="text-[11px] mt-1 break-words font-mono bg-rose-500/10 rounded-lg px-2 py-1.5">
            {codeChange.error || codeChange.message || 'Unknown error'}
          </p>
        </div>
      </div>
      {codeChange.mrUrl && (
        <a
          href={codeChange.mrUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold underline underline-offset-2"
        >
          <ExternalLink className="w-3 h-3" />
          View code change
        </a>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl"
        >
          {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{retrying ? 'Trying again...' : 'Retry'}</span>
        </Button>
      </div>
    </div>
  );
}

export function ProposalReviewModal({
  proposal,
  onClose,
  onApprove,
  onReject,
  onChanged,
  isSubmitting,
  canApprove: mayApprove = true,
}: ProposalReviewModalProps) {
  const [targetVersion, setTargetVersion] = useState('');
  const [targetBranch, setTargetBranch] = useState('development');
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesFromFallback, setBranchesFromFallback] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [decisionTab, setDecisionTab] = useState<DecisionTab>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<CodePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [keySuggestion, setKeySuggestion] = useState<KeySuggestion | null>(null);
  /** Set once approved in this modal; also read from the proposal when reopened */
  const [result, setResult] = useState<{ codeChange: CodeChange | null } | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset and load everything for the selected proposal
  useEffect(() => {
    if (!proposal) return;
    let cancelled = false;
    setDecisionTab(mayApprove ? 'APPROVE' : 'REJECT');
    setRejectReason('');
    setCopiedKey(false);
    setShowAdvanced(false);
    setResult(null);
    setKeySuggestion(null);
    setTargetVersion(proposal.targetSuperAppVersion || '');
    setTargetBranch(proposal.metadata?.targetBranch || 'development');

    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    permissionsApi
      .previewProposal(proposal.id)
      .then((p) => !cancelled && setPreview(p))
      .catch((err) => !cancelled && setPreviewError(err?.message || 'Could not load the changes.'))
      .finally(() => !cancelled && setPreviewLoading(false));

    // Is the requested key a duplicate or a misspelling of an existing one?
    permissionsApi
      .suggestKey(proposal.permissionKey)
      .then((list) => {
        if (cancelled) return;
        const top = list[0];
        if (top && (top.key !== proposal.permissionKey || top.reason === 'exists')) setKeySuggestion(top);
      })
      .catch(() => undefined);

    if (proposal.status === 'PENDING_REVIEW') {
      if (!proposal.targetSuperAppVersion) {
        superAppApi
          .getNextVersion()
          .then((res: { nextVersion?: string }) => {
            const v = String(res?.nextVersion || '').replace(/^v/i, '');
            if (!cancelled && v) setTargetVersion((cur) => cur || v);
          })
          .catch(() => undefined);
      }
      permissionsApi
        .getTargetBranches()
        .then((res) => {
          if (cancelled || !res?.branches?.length) return;
          setBranches(res.branches);
          setBranchesFromFallback(res.source === 'fallback');
          setTargetBranch((cur) =>
            res.branches.includes(cur)
              ? cur
              : res.branches.includes('development')
                ? 'development'
                : res.defaultBranch || res.branches[0],
          );
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [proposal]);

  if (!proposal || !mounted) return null;

  const visual = getCapabilityVisual(proposal.permissionKey, proposal.permissionName, proposal.description);
  const Icon = visual.Icon;
  const isPlatform = !proposal.miniApp?.name && !(proposal.metadata as any)?.miniAppName;
  const miniAppName = proposal.miniApp?.name || (proposal.metadata as any)?.miniAppName || 'Platform / Core Shell';
  const isPending = proposal.status === 'PENDING_REVIEW' && !result;
  const versionValid = VERSION_PATTERN.test(targetVersion.trim());
  const canApprove = mayApprove && versionValid && !!targetBranch && !previewLoading && !isSubmitting;
  const rejectReasonOk = rejectReason.trim().length >= MIN_REJECT_REASON_LENGTH;
  const shownCodeChange: CodeChange | null | undefined = result
    ? result.codeChange
    : proposal.metadata?.codeChange;

  const handleApprove = async () => {
    if (!canApprove) return;
    const codeChange = await onApprove(proposal, targetVersion.trim(), targetBranch);
    if (codeChange !== undefined) setResult({ codeChange: codeChange ?? null });
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await permissionsApi.retryCodeChange(proposal.id);
      setResult({ codeChange: res.codeChange });
      onChanged?.();
    } catch (err: any) {
      setResult({
        codeChange: { ...(shownCodeChange || { status: 'failed' }), status: 'failed', error: err?.message || 'Retry failed' },
      });
    } finally {
      setRetrying(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 text-left">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Review capability ${proposal.permissionName || proposal.permissionKey}`}
        className="relative w-full max-w-2xl my-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 transition-all text-left"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${visual.bgColor} ${visual.borderColor} border flex items-center justify-center shrink-0 shadow-xs`}>
              <Icon className={`w-5 h-5 ${visual.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100"
                  title={`Reference: ${proposal.id}`}
                >
                  {proposal.permissionName || proposal.permissionKey}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    copyText(proposal.permissionKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Copy capability key"
                >
                  <span>{proposal.permissionKey}</span>
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
                </button>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visual.pillBgColor} ${visual.badgeTextColor} border ${visual.borderColor}`}>
                  {visual.category}
                </span>
                <StatusBadge proposal={proposal} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Who and where */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              {isPlatform ? <Globe className="w-3 h-3 text-brand-500" /> : <Smartphone className="w-3 h-3 text-brand-500" />}
              <span>Used by</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">{miniAppName}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Requested by</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">{proposal.requestedBy?.name || 'Developer'}</p>
            {proposal.requestedBy?.email && <p className="text-[10px] text-slate-400 truncate">{proposal.requestedBy.email}</p>}
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Release</span>
            </span>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
              {proposal.targetSuperAppVersion || targetVersion ? `v${proposal.targetSuperAppVersion || targetVersion}` : 'Not set'}
            </p>
          </div>
        </div>

        {proposal.description && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border-l-4 border-l-brand-500 border-r border-t border-b border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Why it is needed
            </span>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{proposal.description}</p>
          </div>
        )}

        {/* Duplicate / misspelled key */}
        {keySuggestion && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {keySuggestion.key === proposal.permissionKey && keySuggestion.reason === 'exists' ? (
                <>
                  <strong>{keySuggestion.name}</strong> already exists in the Super App. If this request is a duplicate,
                  reject it with &quot;Duplicate of existing capability&quot;.
                </>
              ) : (
                <>
                  Did the requester mean <strong>{keySuggestion.name}</strong>{' '}
                  (<span className="font-mono">{keySuggestion.key}</span>)?
                  {keySuggestion.reason === 'exists' && ' It already exists in the Super App.'}
                </>
              )}
            </span>
          </div>
        )}

        {/* What will change in the Super App */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-emerald-500" />
            <span>Changes that will be made to the Super App</span>
          </span>

          {previewLoading && (
            <div className="space-y-2" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          )}

          {!previewLoading && previewError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Could not load the changes: {previewError}</span>
            </div>
          )}

          {!previewLoading && preview && (
            <>
              {preview.files.map((f) => (
                <div key={f.file} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2">
                    <span>{f.label}</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate">{f.file}</span>
                  </div>
                  <pre className="p-3 bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
                    {f.lines.map((l) => `+ ${l}`).join('\n')}
                  </pre>
                </div>
              ))}
              {preview.note && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                    preview.known
                      ? 'bg-sky-500/10 border-sky-500/20 text-sky-800 dark:text-sky-300'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {preview.known ? (
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  )}
                  <span>{preview.note}</span>
                </div>
              )}
              {!!preview.manualSteps?.length && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 space-y-1.5">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                    Work for the Super App team (tracked in a task after approval)
                  </span>
                  <StepList steps={preview.manualSteps} />
                </div>
              )}
            </>
          )}
        </div>

        {isPending ? (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700" role="tablist">
              {((mayApprove ? ['APPROVE', 'REJECT'] : ['REJECT']) as DecisionTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={decisionTab === tab}
                  onClick={() => setDecisionTab(tab)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    decisionTab === tab
                      ? tab === 'APPROVE'
                        ? 'bg-emerald-500 text-white shadow-xs font-bold'
                        : 'bg-rose-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {tab === 'APPROVE' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{tab === 'APPROVE' ? 'Approve' : 'Reject'}</span>
                </button>
              ))}
            </div>

            {decisionTab === 'APPROVE' && mayApprove && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label htmlFor="release-version" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-brand-500" />
                    <span>Release it ships in</span>
                  </label>
                  <input
                    id="release-version"
                    type="text"
                    inputMode="decimal"
                    value={targetVersion}
                    onChange={(e) => setTargetVersion(e.target.value)}
                    placeholder="e.g. 1.4.0"
                    aria-invalid={!!targetVersion && !versionValid}
                    className={`w-full sm:w-48 h-9 text-xs px-3 rounded-xl border bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 font-mono ${
                      targetVersion && !versionValid
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-brand-500/20 focus:border-brand-500'
                    }`}
                  />
                  {targetVersion && !versionValid && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">Use the format 1.4.0 (three numbers).</p>
                  )}
                </div>

                {/* Advanced: which code line to update */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    aria-expanded={showAdvanced}
                    className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <span>Advanced</span>
                    <span className="flex items-center gap-1.5 font-normal text-slate-400">
                      <span className="font-mono">{targetBranch}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {showAdvanced && (
                    <div className="px-3 pb-3 space-y-1">
                      <label htmlFor="target-branch" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Code version to update (git branch)
                      </label>
                      <select
                        id="target-branch"
                        value={targetBranch}
                        onChange={(e) => setTargetBranch(e.target.value)}
                        className="w-full sm:w-64 h-9 text-xs px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                      >
                        {(branches.length ? branches : [targetBranch]).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      {branchesFromFallback && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Couldn&apos;t load branches from the code repository; showing defaults.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {preview && !preview.files.length
                    ? preview.manualSteps?.length
                      ? 'Approving creates a task for the Super App team with the work listed above.'
                      : 'Approving records the capability. Nothing in the Super App has to change.'
                    : `Approving prepares the code change for the Super App team to review and release${
                        versionValid ? ` in v${targetVersion.trim()}` : ''
                      }${preview?.manualSteps?.length ? ', plus a task for the remaining work' : ''}.`}
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting} className="text-xs font-semibold px-4 py-2 rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleApprove}
                    disabled={!canApprove}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>{isSubmitting ? 'Preparing the update...' : 'Approve and update the Super App'}</span>
                  </Button>
                </div>
              </div>
            )}

            {decisionTab === 'REJECT' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="reject-reason" className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span>Reason (required)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Sent to the requester</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {REJECTION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          rejectReason === preset
                            ? 'bg-rose-500 text-white border-rose-500 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="reject-reason"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this capability is declined, so the developer knows what to do next..."
                    aria-describedby="reject-reason-help"
                    className="w-full text-xs p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none leading-relaxed placeholder:text-slate-400"
                  />
                  <p
                    id="reject-reason-help"
                    className={`text-[10px] tabular-nums ${
                      rejectReasonOk ? 'text-slate-400' : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {rejectReasonOk
                      ? 'The developer sees this reason on the request and in the notification.'
                      : `${rejectReason.trim().length}/${MIN_REJECT_REASON_LENGTH} characters minimum`}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting} className="text-xs font-semibold px-4 py-2 rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onReject(proposal, rejectReason)}
                    disabled={isSubmitting || !rejectReasonOk}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Rejecting...' : 'Reject proposal'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <ProposalProgress proposalId={proposal.id} refreshKey={result} />
            {proposal.status === 'REJECTED' && !result ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Proposal declined</span>
                </div>
                {proposal.adminDecisionReason && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 pl-6">Reason: {proposal.adminDecisionReason}</p>
                )}
              </div>
            ) : (
              <CodeChangeResult
                codeChange={
                  shownCodeChange ??
                  (proposal.metadata?.mrUrl
                    ? { status: 'created', mrUrl: proposal.metadata.mrUrl }
                    : null)
                }
                targetVersion={result ? targetVersion.trim() : proposal.targetSuperAppVersion}
                retrying={retrying}
                onRetry={handleRetry}
              />
            )}
            <div className="flex justify-end pt-1">
              <Button variant="secondary" size="sm" onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-xl">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default ProposalReviewModal;
