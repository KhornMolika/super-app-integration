'use client';

import React from 'react';
import {
  UserGroupIcon,
  PlusCircleIcon,
  CodeIcon,
  ShieldIcon,
  EyeIcon,
  LockIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons';
import { getAvatarColor } from './team.utils';
import {
  ACCESS_LEVEL_INFO,
  COLLABORATOR_ROLES,
  CollaboratorRole,
  MiniAppAccessLevel,
  collaboratorRoleLabel,
  hasAccess,
  normalizeCollaboratorRole,
} from '@/lib/miniappAccess';

/**
 * Team members of one MiniApp: the owner, then collaborators.
 *
 * Color (60-30-10): white / slate-900 card (60), slate rows, chips and borders
 * (30), brand only for the primary action and the owner marker (10). Rose
 * appears only on destructive hover.
 */

export interface CollaboratorsSectionProps {
  formData: any;
  collaborators: any[];
  loadingCollaborators: boolean;
  removingUserId: string | null;
  /** The caller's access on this app (from GET /mini-apps/:id `myAccess`). */
  myAccess: MiniAppAccessLevel;
  currentUserId?: string;
  /** User whose role change is in flight. */
  changingRoleUserId?: string | null;
  onOpenAddModal: () => void;
  onSelectCollaboratorToDelete: (collab: any) => void;
  onChangeRole: (collab: any, role: CollaboratorRole) => void;
  onOpenTransferModal: () => void;
}

const ROLE_ICON: Record<CollaboratorRole, React.ComponentType<{ className?: string }>> = {
  VIEWER: EyeIcon,
  DEVELOPER: CodeIcon,
  MAINTAINER: ShieldIcon,
};

function collabUserId(collab: any): string {
  return collab.userId || collab.user?.id || collab.id;
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
        name,
      )}`}
    >
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

function RoleChip({ role }: { role: CollaboratorRole }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
      <Icon className="w-3 h-3 text-slate-400" />
      {collaboratorRoleLabel(role)}
    </span>
  );
}

export function CollaboratorsSection({
  formData,
  collaborators,
  loadingCollaborators,
  removingUserId,
  myAccess,
  currentUserId,
  changingRoleUserId,
  onOpenAddModal,
  onSelectCollaboratorToDelete,
  onChangeRole,
  onOpenTransferModal,
}: CollaboratorsSectionProps) {
  if (!formData.id) return null;

  const canManageTeam = hasAccess(myAccess, 'MAINTAIN');
  const canTransfer = hasAccess(myAccess, 'OWN');
  const totalMembers = 1 + (collaborators?.length || 0);
  const ownerName = formData.owner?.name || formData.ownerName || 'Owner';
  const ownerEmail = formData.owner?.email || formData.ownerEmail || '';
  const isMeOwner = Boolean(currentUserId && formData.ownerId === currentUserId);
  const access = ACCESS_LEVEL_INFO[myAccess];

  return (
    <section
      aria-labelledby="team-members-heading"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
            <UserGroupIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4
              id="team-members-heading"
              className="text-sm font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2"
            >
              <span>Team members</span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Members of this MiniApp&apos;s organization. Each role adds to the one before it.
            </p>
          </div>
        </div>

        {canManageTeam && (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors cursor-pointer w-full sm:w-auto shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Add collaborator</span>
          </button>
        )}
      </div>

      {/* Your access */}
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
        <LockIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Your access: {access.label}.
          </span>{' '}
          {access.summary}
        </p>
      </div>

      {/* Members */}
      <ul className="space-y-2" aria-label="MiniApp team members">
        {/* Owner */}
        <li className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={ownerName} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {ownerName}
                  {isMeOwner && <span className="font-normal text-slate-500"> (you)</span>}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/10 dark:bg-brand-500/15 border border-brand-600/20 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                  <ShieldIcon className="w-3 h-3" />
                  Owner
                </span>
              </div>
              {ownerEmail && (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {ownerEmail}
                </div>
              )}
            </div>
          </div>
          {canTransfer && (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
              Transfer ownership
            </button>
          )}
        </li>

        {/* Collaborators */}
        {loadingCollaborators ? (
          <li className="py-6 text-center text-xs text-slate-400" aria-live="polite">
            Loading collaborators...
          </li>
        ) : collaborators.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No collaborators yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {canManageTeam
                ? 'Add teammates from your organization to view, develop or co-maintain this MiniApp.'
                : 'Only the owner or a maintainer can add collaborators.'}
            </p>
          </li>
        ) : (
          collaborators.map((collab: any) => {
            const userObj = collab.user || {};
            const uid = collabUserId(collab);
            const role = normalizeCollaboratorRole(collab.role);
            const isMe = Boolean(currentUserId && uid === currentUserId);
            const isRemoving = removingUserId === uid;
            const isChanging = changingRoleUserId === uid;
            const displayName = userObj.name || userObj.email || 'Teammate';
            const canEditRow = canManageTeam && !isMe;

            return (
              <li
                key={collab.id || uid}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={displayName} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {displayName}
                      {isMe && <span className="font-normal text-slate-500"> (you)</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {userObj.email || uid}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  {canEditRow ? (
                    <label className="flex-1 sm:flex-none">
                      <span className="sr-only">Role of {displayName}</span>
                      <select
                        value={role}
                        disabled={isChanging || isRemoving}
                        onChange={(e) => onChangeRole(collab, e.target.value as CollaboratorRole)}
                        className="w-full sm:w-auto h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60 cursor-pointer"
                      >
                        {COLLABORATOR_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <RoleChip role={role} />
                  )}

                  {(canEditRow || isMe) && (
                    <button
                      type="button"
                      onClick={() => onSelectCollaboratorToDelete(collab)}
                      disabled={isRemoving}
                      className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                      aria-label={isMe ? 'Leave this MiniApp' : `Remove ${displayName}`}
                    >
                      {isMe ? 'Leave' : 'Remove'}
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Role guide */}
      <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
        <summary className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <span>What can each role do?</span>
          <svg
            className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-3 pb-3">
          {COLLABORATOR_ROLES.map((r) => {
            const Icon = ROLE_ICON[r.value];
            return (
              <div
                key={r.value}
                className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  {r.label}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {r.grants.map((g) => (
                    <li key={g} className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="px-3 pb-3 text-[11px] text-slate-500 dark:text-slate-400">
          The owner and organization admins can also delete the MiniApp and transfer ownership.
        </p>
      </details>
    </section>
  );
}
