'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import {
  UserGroupIcon,
  PlusCircleIcon,
  CodeIcon,
  ShieldIcon,
  EyeIcon,
} from '@/components/ui/Icons';
import { getAvatarColor } from './team.utils';

export interface CollaboratorsSectionProps {
  formData: any;
  collaborators: any[];
  loadingCollaborators: boolean;
  removingUserId: string | null;
  onOpenAddModal: () => void;
  onSelectCollaboratorToDelete: (collab: any) => void;
}

export function CollaboratorsSection({
  formData,
  collaborators,
  loadingCollaborators,
  removingUserId,
  onOpenAddModal,
  onSelectCollaboratorToDelete,
}: CollaboratorsSectionProps) {
  if (!formData.id) return null;

  const totalMembers = 1 + (collaborators?.length || 0);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <UserGroupIcon className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>MiniApp Collaborators &amp; Roles</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                {totalMembers} Members
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage team members who can co-develop, trigger test builds, and inspect security reports for this MiniApp.
            </p>
          </div>
        </div>

        {/* + Add Collaborator Button */}
        <Button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs shrink-0 transition-all cursor-pointer"
        >
          <PlusCircleIcon className="w-4 h-4" />
          <span>Add Collaborator</span>
        </Button>
      </div>

      {/* Members List */}
      <div className="space-y-2.5">
        {/* Primary Owner / Maintainer Row */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(
                formData.ownerName || formData.owner?.name || 'O',
              )}`}
            >
              {(formData.ownerName || formData.owner?.name || 'O').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="truncate">
                  {formData.ownerName || formData.owner?.name || 'Lead Maintainer'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-900/60">
                  Primary Owner
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {formData.ownerEmail || formData.owner?.email || 'Registered Creator'}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hidden sm:inline">
              Full Administrative Authority
            </span>
          </div>
        </div>

        {/* Collaborators Rows */}
        {loadingCollaborators ? (
          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Loading collaborators...</span>
          </div>
        ) : collaborators.length === 0 ? (
          <div className="py-7 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="w-9 h-9 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <UserGroupIcon className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No additional collaborators yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Use <span className="font-semibold text-slate-700 dark:text-slate-300">&quot;Add Collaborator&quot;</span> above to grant agency teammates build, test, and review privileges.
              </p>
            </div>
          </div>
        ) : (
          collaborators.map((collab: any) => {
            const userObj = collab.user || {};
            const isRemoving = removingUserId === (collab.userId || userObj.id);
            return (
              <div
                key={collab.id || collab.userId || userObj.id}
                className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(
                      userObj.name || userObj.email || 'U',
                    )}`}
                  >
                    {(userObj.name || userObj.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {userObj.name || 'Teammate'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {userObj.email || collab.userId}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      collab.role === 'ADMIN'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : collab.role === 'VIEWER'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                    }`}
                  >
                    {collab.role === 'ADMIN' && <ShieldIcon className="w-2.5 h-2.5" />}
                    {collab.role === 'DEVELOPER' && <CodeIcon className="w-2.5 h-2.5" />}
                    {collab.role === 'VIEWER' && <EyeIcon className="w-2.5 h-2.5" />}
                    <span>{collab.role || 'DEVELOPER'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectCollaboratorToDelete(collab)}
                    disabled={isRemoving}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove collaborator"
                  >
                    <svg
                      className={`w-4 h-4 ${isRemoving ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
