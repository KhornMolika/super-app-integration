import { CapabilityProposal } from '../entities/capability-proposal.entity';

/** State of the Super App merge request in GitLab. */
export type MergeRequestState = 'opened' | 'merged' | 'closed' | 'unknown';

export type ProgressState =
  | 'done'
  | 'current'
  | 'pending'
  | 'failed'
  | 'skipped'
  | 'unknown';

export interface ProgressStep {
  key: 'requested' | 'review' | 'decision' | 'code_change' | 'merged' | 'release';
  label: string;
  state: ProgressState;
  detail?: string;
  at?: string;
  links?: { label: string; url: string }[];
}

export interface ProposalProgress {
  proposalId: string;
  capabilityKey: string;
  status: string;
  steps: ProgressStep[];
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function requesterLabel(p: CapabilityProposal): string {
  const r = p.requestedBy as any;
  const who = r?.name || r?.fullName || r?.email;
  const app = (p.miniApp as any)?.name;
  if (who && app) return `${who}, for ${app}`;
  if (who) return who;
  if (app) return `Found while checking ${app}`;
  return 'Requested automatically';
}

/**
 * The steps from request to release, as the Backoffice tracker shows them.
 * `mrState` is the live GitLab state of the code change (null: not looked up).
 */
export function buildProposalProgress(
  proposal: CapabilityProposal,
  mrState: MergeRequestState | null,
): ProposalProgress {
  const status = (proposal.status || 'PENDING_REVIEW').toUpperCase();
  const meta = (proposal.metadata || {}) as Record<string, any>;
  const supporters: unknown[] = Array.isArray(meta.supporters) ? meta.supporters : [];
  const codeChange = meta.codeChange as
    | {
        status: 'created' | 'needs_work' | 'not_needed' | 'failed';
        mrUrl?: string;
        issueUrl?: string;
        error?: string;
        message?: string;
        at?: string;
        targetBranch?: string;
      }
    | undefined;
  const decided = status !== 'PENDING_REVIEW';
  const decidedAt = decided ? iso(proposal.updatedAt) : undefined;

  const steps: ProgressStep[] = [];

  steps.push({
    key: 'requested',
    label: 'Requested',
    state: 'done',
    at: iso(proposal.createdAt),
    detail:
      requesterLabel(proposal) +
      (supporters.length > 0
        ? ` (${supporters.length} more mini app${supporters.length === 1 ? '' : 's'} asked for it too)`
        : ''),
  });

  steps.push({
    key: 'review',
    label: 'In review',
    state: decided ? 'done' : 'current',
    detail: decided ? undefined : 'Waiting for a Super Admin to decide.',
  });

  if (status === 'REJECTED') {
    steps.push({
      key: 'decision',
      label: 'Rejected',
      state: 'failed',
      at: decidedAt,
      detail: proposal.adminDecisionReason || 'No reason given.',
    });
    return { proposalId: proposal.id, capabilityKey: proposal.capabilityKey, status, steps };
  }

  steps.push({
    key: 'decision',
    label:
      status === 'IN_DEVELOPMENT' ? 'Accepted, in development' : status === 'APPROVED' ? 'Approved' : 'Decision',
    state: decided ? 'done' : 'pending',
    at: decidedAt,
    detail: decided && proposal.adminDecisionReason ? proposal.adminDecisionReason : undefined,
  });

  // Code change in the Super App repository
  const links: { label: string; url: string }[] = [];
  if (codeChange?.mrUrl) links.push({ label: 'Code change', url: codeChange.mrUrl });
  if (codeChange?.issueUrl) links.push({ label: 'Task for the Super App team', url: codeChange.issueUrl });

  let codeStep: ProgressStep;
  if (!codeChange) {
    codeStep = {
      key: 'code_change',
      label: 'Code change',
      state: status === 'APPROVED' ? 'skipped' : 'pending',
      detail: status === 'APPROVED' ? 'Approved without creating a code change.' : undefined,
    };
  } else if (codeChange.status === 'failed') {
    codeStep = {
      key: 'code_change',
      label: 'Code change failed',
      state: 'failed',
      at: codeChange.at,
      detail: codeChange.error || codeChange.message,
      links,
    };
  } else if (codeChange.status === 'not_needed') {
    codeStep = {
      key: 'code_change',
      label: 'No code change needed',
      state: 'done',
      at: codeChange.at,
      detail: codeChange.message,
      links,
    };
  } else {
    codeStep = {
      key: 'code_change',
      label: 'Code change ready',
      state: 'done',
      at: codeChange.at,
      detail:
        codeChange.status === 'needs_work'
          ? 'Some work has to be done by hand; it is tracked in a task for the Super App team.'
          : `Waiting for review into ${codeChange.targetBranch || 'the Super App'}.`,
      links,
    };
  }
  steps.push(codeStep);

  // Merge
  if (codeChange?.mrUrl) {
    const merged: ProgressStep = { key: 'merged', label: 'Merged', state: 'pending' };
    if (mrState === 'merged') merged.state = 'done';
    else if (mrState === 'opened') {
      merged.state = 'current';
      merged.detail = 'The code change is waiting for review.';
    } else if (mrState === 'closed') {
      merged.state = 'failed';
      merged.label = 'Closed without merging';
      merged.detail = 'The code change was closed. Ask the Super App team, or retry from the request.';
    } else {
      merged.state = 'unknown';
      merged.detail = 'Could not check the code change right now.';
    }
    steps.push(merged);
  } else {
    steps.push({
      key: 'merged',
      label: 'Merged',
      state: codeChange?.status === 'not_needed' || codeStep.state === 'skipped' ? 'skipped' : 'pending',
    });
  }

  // Release
  const shipped = proposal.implementedInSuperAppVersion;
  const target = proposal.targetSuperAppVersion;
  steps.push({
    key: 'release',
    label: shipped ? `Released in ${shipped}` : target ? `Ships in ${target}` : 'Release',
    state: shipped ? 'done' : 'pending',
    detail: shipped ? undefined : target ? undefined : 'No Super App version chosen yet.',
  });

  return { proposalId: proposal.id, capabilityKey: proposal.capabilityKey, status, steps };
}
