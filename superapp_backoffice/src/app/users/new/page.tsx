'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usersApi, organizationsApi, rolesApi, unwrapData, Organization } from '@/api';
import { useAuth } from '@/lib/auth';
import { isPlatformOwnerOrgCode, PLATFORM_OWNER_ORG_CODE } from '@/lib/config';
import { OrganizationSelect } from '@/components/organizations/OrganizationSelect';
import { toast } from '@/components/ui/Toast';

/**
 * New Backoffice user: identity (name, email, sign-in), organization, role and
 * staff profile. Every field is checked as you type, against the same rules the
 * API applies (unique email, staff ID unique in the organization, Super Admin
 * for the platform owner organization only).
 */

type RoleKey = 'MA_DEVELOPER' | 'ADMIN' | 'SUPER_ADMIN' | 'STAFF';

const ROLE_INFO: Record<RoleKey, { label: string; text: string }> = {
  MA_DEVELOPER: {
    label: 'Mini App Developer',
    text: 'Registers and builds mini apps, and works on apps shared with them.',
  },
  ADMIN: {
    label: 'Org Admin',
    text: 'Manages the users and mini apps of their organization.',
  },
  SUPER_ADMIN: {
    label: 'Super Admin',
    text: 'Runs the platform: reviews and approves mini apps for every organization.',
  },
  STAFF: {
    label: 'Staff',
    text: 'Uses the Super App on mobile only. No Backoffice access.',
  },
};
const ROLE_ORDER: RoleKey[] = ['MA_DEVELOPER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{6,30}$/;

interface FormState {
  name: string;
  email: string;
  setPassword: boolean;
  password: string;
  organizationId: string;
  role: RoleKey | '';
  staffId: string;
  position: string;
  phoneNumber: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass = (error?: string) =>
  `w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
    error
      ? 'border-rose-400 dark:border-rose-500/60 focus:ring-rose-500/20'
      : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
  }`;

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{text}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function NewUserPage() {
  const router = useRouter();
  const { user: me, hasRole, can } = useAuth();
  const isSuper = hasRole('SUPER_ADMIN');
  const myOrgId = me?.organizationId || '';

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [taken, setTaken] = useState<{ email?: string; staffId?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  // Super Admins can also add a mobile app user (consumers belong to no organization)
  const [accountType, setAccountType] = useState<'STAFF' | 'CONSUMER'>('STAFF');
  const isConsumer = accountType === 'CONSUMER';

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    setPassword: true,
    password: '',
    organizationId: '',
    role: 'MA_DEVELOPER',
    staffId: '',
    position: '',
    phoneNumber: '',
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const touch = (key: keyof FormState) => setTouched((t) => ({ ...t, [key]: true }));

  // An organization admin adds users to their own organization only
  useEffect(() => {
    if (!isSuper && myOrgId) setForm((f) => ({ ...f, organizationId: myOrgId }));
  }, [isSuper, myOrgId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [orgRes, roles] = await Promise.all([organizationsApi.getAll({ limit: 100 }), rolesApi.getAll()]);
        if (!alive) return;
        setOrgs(unwrapData<Organization>(orgRes));
        setRoleNames((roles as any[]).map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean));
      } catch (e: any) {
        if (alive) setLoadError(e?.message || 'Could not load organizations and roles.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedOrg = orgs.find((o) => o.id === form.organizationId) || (me?.organization as Organization | undefined);
  const superAdminAllowed = isSuper && isPlatformOwnerOrgCode(selectedOrg?.code);

  const roleOptions = useMemo(
    () =>
      ROLE_ORDER.filter((r) => roleNames.length === 0 || roleNames.includes(r)).filter(
        (r) => r !== 'SUPER_ADMIN' || superAdminAllowed,
      ),
    [roleNames, superAdminAllowed],
  );

  // Super Admin disappears when the organization is not the platform owner's
  useEffect(() => {
    if (form.role && !roleOptions.includes(form.role as RoleKey)) set('role', 'MA_DEVELOPER');
  }, [roleOptions, form.role]);

  // Email and staff ID: already used? (debounced)
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    const staffId = form.staffId.trim();
    if (!EMAIL.test(email) && !(staffId && form.organizationId)) return;
    const t = setTimeout(async () => {
      try {
        const res: any = await usersApi.availability({
          email: EMAIL.test(email) ? email : undefined,
          staffId: staffId || undefined,
          organizationId: form.organizationId || undefined,
        });
        const r = res?.data ?? res;
        setTaken({
          email: r?.emailTaken ? email : undefined,
          staffId: r?.staffIdTaken ? `${form.organizationId}:${staffId}` : undefined,
        });
      } catch {
        // The server checks again on submit
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.email, form.staffId, form.organizationId]);

  const errors: Errors = useMemo(() => {
    const e: Errors = {};
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) e.name = 'Enter the full name.';
    else if (name.length > 120) e.name = 'At most 120 characters.';
    if (!email) e.email = 'Enter an email address.';
    else if (!EMAIL.test(email)) e.email = 'Enter a valid email address.';
    else if (taken.email === email) e.email = 'This email is already used by another account.';
    if (form.setPassword && form.password.trim().length < 6) e.password = 'At least 6 characters.';
    if (!isConsumer) {
      if (!form.organizationId) e.organizationId = 'Choose an organization.';
      if (!form.role) e.role = 'Choose a role.';
      const staffId = form.staffId.trim();
      if (staffId.length > 50) e.staffId = 'At most 50 characters.';
      else if (staffId && taken.staffId === `${form.organizationId}:${staffId}`)
        e.staffId = 'Already used in this organization.';
      if (form.position.trim().length > 100) e.position = 'At most 100 characters.';
    }
    if (form.phoneNumber.trim() && !PHONE.test(form.phoneNumber.trim()))
      e.phoneNumber = 'Digits, spaces, ( ) and -, with an optional leading +.';
    return e;
  }, [form, taken, isConsumer]);

  const shown = (key: keyof FormState) => (touched[key] ? errors[key] : undefined);
  const hasErrors = Object.keys(errors).length > 0;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      organizationId: true,
      role: true,
      staffId: true,
      position: true,
      phoneNumber: true,
    });
    if (hasErrors) {
      toast.warning('Fix the highlighted fields first.');
      return;
    }
    setSubmitting(true);
    try {
      const common = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.setPassword ? form.password.trim() : undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
      };
      const res: any = await usersApi.create(
        (isConsumer
          ? { ...common, accountType: 'CONSUMER' }
          : {
              ...common,
              organizationId: form.organizationId,
              roleNames: [form.role],
              staffId: form.staffId.trim() || undefined,
              position: form.position.trim() || undefined,
            }) as any,
      );
      const created = res?.data ?? res;
      toast.success(`${form.name.trim()} was added.`, 'User created');
      router.push(created?.id ? `/users/${created.id}` : '/users');
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the user.', 'Not created');
    } finally {
      setSubmitting(false);
    }
  };

  if (!can('user:manage')) {
    return (
      <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        You do not have permission to add users.
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full min-w-0 space-y-5 pb-28 sm:pb-8">
      <div>
        <Link href="/users" className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          Users
        </Link>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">New user</h1>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {isSuper && (
        <div role="radiogroup" aria-label="Account type" className="grid gap-2 sm:grid-cols-2">
          {[
            { v: 'STAFF' as const, t: 'Back-office staff', d: 'Works in an organization and signs in to the Back Office.' },
            { v: 'CONSUMER' as const, t: 'Mobile app user', d: 'Uses the Super App on a phone. No organization or role.' },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                accountType === o.v
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="accountType"
                className="mt-1 accent-emerald-600"
                checked={accountType === o.v}
                onChange={() => setAccountType(o.v)}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{o.t}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{o.d}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2 items-start">
      <Section title="Account" text="How this person signs in.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" required error={shown('name')}>
            <input
              id="name"
              autoComplete="off"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => touch('name')}
              aria-invalid={Boolean(shown('name'))}
              className={inputClass(shown('name'))}
            />
          </Field>
          <Field label="Email" htmlFor="email" required error={shown('email') || (taken.email === form.email.trim().toLowerCase() ? errors.email : undefined)}>
            <input
              id="email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              onBlur={() => touch('email')}
              aria-invalid={Boolean(shown('email'))}
              className={inputClass(shown('email'))}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: true, t: 'Set it now', d: 'Share it with the person yourself.' },
              { v: false, t: 'They set it', d: isConsumer ? 'They use Forgot password in the app.' : 'They use Forgot password on the sign-in page.' },
            ].map((o) => (
              <label
                key={String(o.v)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  form.setPassword === o.v
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="setPassword"
                  className="mt-1 accent-emerald-600"
                  checked={form.setPassword === o.v}
                  onChange={() => set('setPassword', o.v)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{o.t}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{o.d}</span>
                </span>
              </label>
            ))}
          </div>
          {form.setPassword && (
            <Field label="Password" htmlFor="password" required hint="At least 6 characters." error={shown('password')}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                  aria-invalid={Boolean(shown('password'))}
                  className={inputClass(shown('password')) + ' pr-16'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 my-auto h-8 px-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          )}
        </fieldset>
      </Section>

      {isConsumer ? (
        <Section title="Mobile profile" text="Optional. Shown on the person's profile in the app.">
          <Field label="Phone" htmlFor="phoneNumber" error={shown('phoneNumber')}>
            <input
              id="phoneNumber"
              type="tel"
              autoComplete="off"
              placeholder="+855 12 345 678"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              onBlur={() => touch('phoneNumber')}
              className={inputClass(shown('phoneNumber'))}
            />
          </Field>
        </Section>
      ) : (
        <>
      <Section title="Organization" text="The organization this person works for. It decides which mini apps and users they can see.">
        {isSuper ? (
          <Field label="Organization" htmlFor="organization" required error={shown('organizationId')}>
            <OrganizationSelect
              id="organization"
              organizations={orgs}
              value={form.organizationId}
              placeholder={loading ? 'Loading organizations...' : 'Choose an organization'}
              disabled={loading}
              error={shown('organizationId')}
              onChange={(id) => {
                set('organizationId', id || '');
                touch('organizationId');
              }}
            />
          </Field>
        ) : (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
            {selectedOrg ? `${selectedOrg.name}${selectedOrg.code ? ` (${selectedOrg.code})` : ''}` : 'Your organization'}
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              You can add users to your own organization only.
            </span>
          </div>
        )}
      </Section>

      <Section
        title="Role"
        text={isSuper ? `What this person can do. Super Admin is for ${PLATFORM_OWNER_ORG_CODE} members only.` : 'What this person can do.'}
      >
        <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-2">
          {roleOptions.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                form.role === r
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="role"
                className="mt-1 accent-emerald-600"
                checked={form.role === r}
                onChange={() => set('role', r)}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{ROLE_INFO[r].label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{ROLE_INFO[r].text}</span>
              </span>
            </label>
          ))}
        </div>
        {shown('role') && <p className="text-xs text-rose-600 dark:text-rose-400">{errors.role}</p>}
      </Section>

      <Section title="Staff profile" text="Optional. Shown on the person's profile and in the mobile app.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Staff ID" htmlFor="staffId" hint="Unique within the organization." error={shown('staffId') || (form.staffId.trim() && taken.staffId === `${form.organizationId}:${form.staffId.trim()}` ? errors.staffId : undefined)}>
            <input
              id="staffId"
              autoComplete="off"
              value={form.staffId}
              onChange={(e) => set('staffId', e.target.value)}
              onBlur={() => touch('staffId')}
              className={inputClass(shown('staffId'))}
            />
          </Field>
          <Field label="Position" htmlFor="position" error={shown('position')}>
            <input
              id="position"
              autoComplete="off"
              value={form.position}
              onChange={(e) => set('position', e.target.value)}
              onBlur={() => touch('position')}
              className={inputClass(shown('position'))}
            />
          </Field>
          <Field label="Phone" htmlFor="phoneNumber" error={shown('phoneNumber')}>
            <input
              id="phoneNumber"
              type="tel"
              autoComplete="off"
              placeholder="+855 12 345 678"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              onBlur={() => touch('phoneNumber')}
              className={inputClass(shown('phoneNumber'))}
            />
          </Field>
        </div>
      </Section>
        </>
      )}
      </div>

      {/* Actions: pinned to the bottom on phones */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
        <div className="flex gap-2 sm:justify-end">
          <Link
            href="/users"
            className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create user'}
          </button>
        </div>
      </div>
    </form>
  );
}
