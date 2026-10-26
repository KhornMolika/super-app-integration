'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Label, Button } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { miniappsApi, usersApi, User } from '@/api';
import {
  UserGroupIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  CodeIcon,
  ShieldIcon,
  EyeIcon,
  PlusCircleIcon,
  BuildingIcon,
} from '@/components/ui/Icons';
import { getAvatarColor } from './team.utils';

export interface AddCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  resolvedOrgId?: string;
  agencyName: string;
  collaborators: any[];
  setCollaborators: React.Dispatch<React.SetStateAction<any[]>>;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
}

export function AddCollaboratorModal({
  isOpen,
  onClose,
  formData,
  resolvedOrgId,
  agencyName,
  collaborators,
  setCollaborators,
  setFormData,
}: AddCollaboratorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [agencyStaff, setAgencyStaff] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'DEVELOPER' | 'ADMIN' | 'VIEWER'>('DEVELOPER');
  const [isInviting, setIsInviting] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedUser(null);
      setSelectedRole('DEVELOPER');
      setIsSearchDropdownOpen(false);
    }
  }, [isOpen]);

  // Load agency staff when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchAgencyStaff = async () => {
      setIsSearchingUsers(true);
      try {
        const params: Record<string, any> = {
          limit: 100,
          status: 'ACTIVE',
        };
        if (resolvedOrgId) {
          params.organizationId = resolvedOrgId;
        }
        const usersRes = await usersApi.getAll(params);
        const userList = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.data || [];
        setAgencyStaff(userList);
      } catch (err) {
        console.warn('Failed to load agency staff', err);
      } finally {
        setIsSearchingUsers(false);
      }
    };
    fetchAgencyStaff();
  }, [isOpen, resolvedOrgId]);

  // Filter candidate active staff: in agency, not owner, and not already a collaborator
  const candidateStaff = agencyStaff.filter((u) => {
    const isOwner =
      u.id === formData.ownerId ||
      u.email?.toLowerCase() === formData.ownerEmail?.toLowerCase() ||
      u.id === formData.owner?.id ||
      u.email?.toLowerCase() === formData.owner?.email?.toLowerCase();
    if (isOwner) return false;

    const isAlreadyCollab = collaborators.some(
      (c) => c.userId === u.id || c.user?.id === u.id,
    );
    if (isAlreadyCollab) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const handleInviteCollaborator = async () => {
    if (!formData.id || !selectedUser) return;
    setIsInviting(true);

    const userToAdd = selectedUser;
    const roleToAdd = selectedRole;

    // 1. Optimistic collaborator entity
    const newCollab = {
      id: `collab-${userToAdd.id}`,
      miniAppId: formData.id,
      userId: userToAdd.id,
      role: roleToAdd,
      user: userToAdd,
      createdAt: new Date().toISOString(),
    };

    // 2. Close modal & reset selection immediately
    onClose();
    setSelectedUser(null);
    setSearchQuery('');
    setSelectedRole('DEVELOPER');

    // 3. Immediately update local state
    setCollaborators((prev) => {
      const filtered = prev.filter((c) => c.userId !== userToAdd.id && c.user?.id !== userToAdd.id);
      return [...filtered, newCollab];
    });

    if (setFormData) {
      setFormData((prev: any) => ({
        ...prev,
        collaborators: [
          ...(prev.collaborators || []).filter(
            (c: any) => c.userId !== userToAdd.id && c.user?.id !== userToAdd.id,
          ),
          newCollab,
        ],
      }));
    }

    // 4. Send persistent API request
    try {
      const res = await miniappsApi.addCollaborator(formData.id, userToAdd.id, roleToAdd);
      toast.success(
        `${userToAdd.name || userToAdd.email} has been added as ${roleToAdd}!`,
        'Collaborator Added',
      );

      if (res && (res as any).id) {
        setCollaborators((prev) =>
          prev.map((c) => (c.userId === userToAdd.id ? { ...c, ...(res as any) } : c)),
        );
      }

      // Reconcile with latest server data in background
      miniappsApi
        .getCollaborators(formData.id)
        .then((updated) => {
          if (Array.isArray(updated) && updated.length > 0) {
            setCollaborators(updated);
          }
        })
        .catch(() => {});
    } catch (err: any) {
      // Roll back optimistic state if API failed
      setCollaborators((prev) =>
        prev.filter((c) => c.userId !== userToAdd.id && c.user?.id !== userToAdd.id),
      );
      if (setFormData) {
        setFormData((prev: any) => ({
          ...prev,
          collaborators: (prev.collaborators || []).filter(
            (c: any) => c.userId !== userToAdd.id && c.user?.id !== userToAdd.id,
          ),
        }));
      }
      toast.error(err?.message || 'Failed to add collaborator.', 'Error');
    } finally {
      setIsInviting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => !isInviting && onClose()}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6 max-h-[88vh] overflow-y-auto space-y-4 my-auto -translate-y-6 sm:-translate-y-10 transition-all">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs">
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Add MiniApp Collaborator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-800/80">
                  Direct (1-Click)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select an active colleague from your agency to grant direct access to this MiniApp.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isInviting}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Autocomplete Search Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Organization Member <span className="text-rose-500">*</span>
            </Label>
            {agencyName && (
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium flex items-center gap-1">
                <BuildingIcon className="w-3 h-3 text-slate-400" />
                <span>Organization: {agencyName}</span>
              </span>
            )}
          </div>

          {/* Selected User Highlight Card */}
          {selectedUser ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/60 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs ring-2 ring-white/20 dark:ring-slate-800 ${getAvatarColor(
                    selectedUser.name || selectedUser.email,
                  )}`}
                >
                  {(selectedUser.name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedUser.name || 'Agency Teammate'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 uppercase tracking-wide">
                      <CheckIcon className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Selected</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                    {selectedUser.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={isInviting}
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                  setIsSearchDropdownOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 shadow-2xs shrink-0 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Change</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Search Input Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  placeholder="Type name or email to search active agency staff..."
                  className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Candidate Results */}
              {isSearchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/70 animate-in fade-in slide-in-from-top-1 duration-150">
                  {isSearchingUsers ? (
                    <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Searching active agency staff...</span>
                    </div>
                  ) : candidateStaff.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 px-4">
                      {searchQuery.trim() ? (
                        <>
                          No active staff matching{' '}
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            &quot;{searchQuery}&quot;
                          </span>
                        </>
                      ) : (
                        'No other active staff available in this agency'
                      )}
                    </div>
                  ) : (
                    candidateStaff.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="w-full text-left p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${getAvatarColor(
                              user.name || user.email,
                            )}`}
                          >
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
                              {user.name || 'Unnamed Staff'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-lg font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 group-hover:bg-brand-600 group-hover:text-white group-hover:border-transparent transition-all shrink-0 shadow-2xs">
                          Select
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Role Selection Cards (ADMIN, DEVELOPER, VIEWER) */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Collaborator Role <span className="text-rose-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* DEVELOPER Card */}
            <div
              onClick={() => setSelectedRole('DEVELOPER')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                selectedRole === 'DEVELOPER'
                  ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/25 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 uppercase tracking-wider flex items-center gap-1">
                  <CodeIcon className="w-3 h-3" />
                  <span>DEVELOPER</span>
                </span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedRole === 'DEVELOPER'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-transparent'
                  }`}
                >
                  {selectedRole === 'DEVELOPER' && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Push revisions, trigger test builds, and inspect test APK artifacts.
              </p>
            </div>

            {/* ADMIN Card */}
            <div
              onClick={() => setSelectedRole('ADMIN')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                selectedRole === 'ADMIN'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/25 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 uppercase tracking-wider flex items-center gap-1">
                  <ShieldIcon className="w-3 h-3" />
                  <span>ADMIN</span>
                </span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedRole === 'ADMIN'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-transparent'
                  }`}
                >
                  {selectedRole === 'ADMIN' && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Co-maintainer. Manage collaborators, security, and integration secrets.
              </p>
            </div>

            {/* VIEWER Card */}
            <div
              onClick={() => setSelectedRole('VIEWER')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                selectedRole === 'VIEWER'
                  ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/25 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 uppercase tracking-wider flex items-center gap-1">
                  <EyeIcon className="w-3 h-3" />
                  <span>VIEWER</span>
                </span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedRole === 'VIEWER'
                      ? 'border-purple-500 bg-purple-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-transparent'
                  }`}
                >
                  {selectedRole === 'VIEWER' && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Read-only. Inspect build telemetry, issues, and audit records.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            disabled={isInviting}
            onClick={onClose}
            className="text-xs px-4 h-9 font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedUser || isInviting}
            onClick={handleInviteCollaborator}
            className="text-xs px-5 h-9 font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInviting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Inviting...</span>
              </>
            ) : (
              <>
                <PlusCircleIcon className="w-3.5 h-3.5" />
                <span>Invite</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
