/**
 * The current suspension and archive request of an app, replayed from its
 * status events (mini_app_status_events, Phase 6f). Same shapes the
 * Backoffice reads (MiniAppSuspension, MiniAppArchiveRequest).
 *
 * No imports: the MiniApp entity uses this after load.
 */

export interface StatusEventLike {
  type?: string | null;
  reason?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  previousAvailability?: string | null;
  createdAt?: Date | string | null;
}

export interface SuspensionState {
  reason: string;
  suspendedById?: string;
  suspendedByName?: string;
  suspendedAt: string;
  previousAvailability?: string;
  archivedAt?: string;
}

export interface ArchiveRequestState {
  reason: string;
  requestedById?: string;
  requestedByName?: string;
  requestedAt: string;
}

const iso = (d: Date | string | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : new Date(d).toISOString()) : new Date(0).toISOString();
const opt = (v: string | null | undefined) => (v == null ? undefined : v);

/** Oldest first; events at the same moment keep their order. */
export function sortEvents<T extends StatusEventLike>(events: T[]): T[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => new Date(a.e.createdAt || 0).getTime() - new Date(b.e.createdAt || 0).getTime() || a.i - b.i)
    .map((x) => x.e);
}

export function retirementStateOf(events: StatusEventLike[] | null | undefined): {
  suspension: SuspensionState | null;
  archiveRequest: ArchiveRequestState | null;
} {
  let suspension: SuspensionState | null = null;
  let archiveRequest: ArchiveRequestState | null = null;
  for (const e of sortEvents(events ?? [])) {
    const at = iso(e.createdAt);
    switch (String(e.type || '').toUpperCase()) {
      case 'SUSPENDED':
        suspension = {
          reason: e.reason ?? '',
          suspendedById: opt(e.actorId),
          suspendedByName: opt(e.actorName),
          suspendedAt: at,
          previousAvailability: opt(e.previousAvailability),
        };
        break;
      case 'ARCHIVED':
        // Archiving a suspended app keeps who suspended it and when
        suspension = {
          ...(suspension ?? {
            suspendedById: opt(e.actorId),
            suspendedByName: opt(e.actorName),
            suspendedAt: at,
            previousAvailability: opt(e.previousAvailability),
          }),
          reason: e.reason ?? '',
          archivedAt: at,
        };
        archiveRequest = null;
        break;
      case 'RESUMED':
      case 'RESTORED':
        suspension = null;
        archiveRequest = null;
        break;
      case 'ARCHIVE_REQUESTED':
        archiveRequest = {
          reason: e.reason ?? '',
          requestedById: opt(e.actorId),
          requestedByName: opt(e.actorName),
          requestedAt: at,
        };
        break;
      case 'ARCHIVE_DECLINED':
        archiveRequest = null;
        break;
    }
  }
  return { suspension, archiveRequest };
}
