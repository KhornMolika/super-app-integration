/**
 * Mini App access, mirrored from the API (superapp_backend/src/miniapps/access).
 *
 * The API returns `myAccess` on GET /mini-apps/:id: the caller's level on that
 * app. The UI only hides what the API would refuse anyway; it never grants.
 *
 *   SUPER_ADMIN          every app                      -> ADMIN
 *   ADMIN (org admin)    apps of their organization     -> ADMIN
 *   owner                                               -> OWN
 *   MAINTAINER collaborator                             -> MAINTAIN
 *   DEVELOPER collaborator                              -> EDIT
 *   VIEWER collaborator                                 -> VIEW
 */

export type MiniAppAccessLevel = 'NONE' | 'VIEW' | 'EDIT' | 'MAINTAIN' | 'OWN' | 'ADMIN';

const RANK: Record<MiniAppAccessLevel, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  MAINTAIN: 3,
  OWN: 4,
  ADMIN: 5,
};

/** Normalizes the API value; unknown or missing reads as VIEW (the page loaded, so at least that). */
export function toAccessLevel(value: unknown): MiniAppAccessLevel {
  const v = typeof value === 'string' ? (value.toUpperCase() as MiniAppAccessLevel) : 'VIEW';
  return v in RANK ? v : 'VIEW';
}

export function hasAccess(level: MiniAppAccessLevel, required: MiniAppAccessLevel): boolean {
  return RANK[level] >= RANK[required];
}

/** What the caller's level means, for the "Your access" chip and notices. */
export const ACCESS_LEVEL_INFO: Record<MiniAppAccessLevel, { label: string; summary: string }> = {
  NONE: { label: 'No access', summary: 'You cannot open this MiniApp.' },
  VIEW: {
    label: 'Viewer',
    summary: 'Read-only. You can inspect details, builds and issues, and download test builds.',
  },
  EDIT: {
    label: 'Developer',
    summary:
      'You can edit details, URLs and versions, upload artifacts and rescan. Permission changes and submitting need a maintainer.',
  },
  MAINTAIN: {
    label: 'Maintainer',
    summary: 'You can edit, change permissions, submit for review, roll back and manage collaborators.',
  },
  OWN: {
    label: 'Owner',
    summary: 'Full control of this MiniApp, including deleting it and transferring ownership.',
  },
  ADMIN: {
    label: 'Admin',
    summary: 'Organization admin: full control, plus review, approval and suspension.',
  },
};

export type CollaboratorRole = 'VIEWER' | 'DEVELOPER' | 'MAINTAINER';

export const COLLABORATOR_ROLES: Array<{
  value: CollaboratorRole;
  label: string;
  summary: string;
  grants: string[];
}> = [
  {
    value: 'VIEWER',
    label: 'Viewer',
    summary: 'Read-only access.',
    grants: ['View details, builds and issues', 'Download test builds'],
  },
  {
    value: 'DEVELOPER',
    label: 'Developer',
    summary: 'Works on the app.',
    grants: ['Everything a Viewer can do', 'Edit details, URLs and versions', 'Upload artifacts and rescan'],
  },
  {
    value: 'MAINTAINER',
    label: 'Maintainer',
    summary: 'Co-maintains the app.',
    grants: [
      'Everything a Developer can do',
      'Change requested permissions',
      'Submit for review and roll back',
      'Add and remove collaborators',
    ],
  },
];

/** Collaborator rows written before the rename store ADMIN for MAINTAINER. */
export function normalizeCollaboratorRole(role: unknown): CollaboratorRole {
  const r = typeof role === 'string' ? role.toUpperCase() : '';
  if (r === 'ADMIN' || r === 'MAINTAINER') return 'MAINTAINER';
  if (r === 'VIEWER') return 'VIEWER';
  return 'DEVELOPER';
}

export function collaboratorRoleLabel(role: unknown): string {
  const r = normalizeCollaboratorRole(role);
  return COLLABORATOR_ROLES.find((c) => c.value === r)?.label ?? 'Developer';
}
