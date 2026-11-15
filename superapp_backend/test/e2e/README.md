# End-to-end flows

The real backend (AppModule: controllers, guards, services, Postgres) driven
over HTTP the way the Backoffice and the Super App call it.

```bash
pnpm test:e2e                  # all suites, ~80 s
pnpm test:e2e 02               # one suite
```

Needs the local Postgres (`superapp-postgres`, settings from `.env.development`).
Each run **drops and recreates `dps_e2e`** (never another database: the name must
contain `e2e`) and the first boot applies every migration, so the run also proves
the migration chain on an empty database.

Nothing outside is called: Jenkins is a recording fake (`support/app.ts`); the
tests play Jenkins by posting scan and build results to the real callback
endpoints with the callback token. Telegram and email are off, Nexus/GitLab point
at a closed port. Test users are `@e2e.local` (the seeder purges `@example.com`
and `@test.com` on every boot).

| Suite | Covers |
|---|---|
| 01-staff-access | Backoffice sign-in, refresh, roles (STAFF is phone-only, Super Admin only in FTC), organization isolation, collaborators, who may decide reviews |
| 02-miniapp-lifecycle | Draft to live step by step, with phone visibility per build at every stage; steps out of order; failed scan; callback tokens; request changes; reject; failed and retried test build |
| 03-retirement | Suspend, resume, archive request and decline, archive, restore: permissions, events, effect on phones |
| 04-live-updates | New version of a live app, discard, publish on approval, testing a new version, rollback |
| 05-phone-accounts | Sign-up with email code, sign-in, lockout, refresh rotation, logout, phone vs Backoffice tokens |
| 06-password-change | Passwords someone else chose (seed accounts, accounts created or reset by an admin): forced change in the Backoffice and on the phone; no seed-password fallback; deactivated seed accounts stay out |
| 07-user-management | What an organization ADMIN may manage (own organization only), editing mobile app users, no password hash from clients, sign-up and verification-code answers that do not reveal registered emails |

## Bugs these flows found (all fixed, each guarded by a test)

| Severity | Bug | Fix |
|---|---|---|
| Critical | A developer made an app LIVE by sending `lifecycleStatus`/`availabilityStatus` on create or PATCH | Status fields removed from the DTO and stripped from every create/update body (`miniapps.controller.ts`) |
| Critical | `start-testing` on a live app with no new version turned it DRAFT (off every phone) | Refused with 400 "Nothing new to test" |
| High | Approve accepted a never-submitted draft and an app whose scan was still running | Approve only from IN_REVIEW; a live app's new version only after its own scan passed; `POST /mini-apps` starts at SUBMITTED |
| High | Outside production every phone account accepted `SUPERADMIN_PASSWORD` and the login overwrote the user's password | Fallback removed from phone login; the staff change-password fallback limited to the official seed accounts |
| High | A restored app could not be submitted again | Restore opens a new version (next patch) copied from the last one |
| Medium | Backoffice refresh tokens were stateless: no rotation, logout did not end them | Recorded in `refresh_tokens` (sha256 of the jti), rotated on refresh (30 s grace for parallel tabs), revoked on logout and on replay |
| Medium | A developer could roll back the live version; rollback put a suspended or archived app back on the phones | Rollback needs `miniapp:approve` (Super Admin) and a LIVE app |
| Medium | `SUPERADMIN_PASSWORD` opened official seed accounts outside production, and seed accounts were forced back to ACTIVE | Fallbacks removed; seed accounts and admin-set passwords must be changed at first sign-in |
| Medium | Jenkins refusing the test build still answered "Success" | 502 with Jenkins' message; the app shows Build failed |
| Medium | `/mobile/auth/dev-reset-limits` reset brute-force protection for anyone | Endpoint removed |
| Low | Backoffice login told unknown email from wrong password | One message |
| Low | Backoffice sign-up and "resend code" told which emails had an account | Same answer for new, existing, verified and unknown emails |
| Medium | An ADMIN could overwrite a user's password hash (`passwordHash` in the user body) | No longer accepted from clients |
| Low | A second `start-testing` queued another build | 409 while a build runs (retry allowed after two hours) |

## Not covered yet

Flutter package, Native SDK and Deep Link apps (archive upload, Nexus publish,
codegen), capability proposals, organizations and user management, settings,
notifications/Telegram, storage and avatars, audit log, the Super App build
pages, the Backoffice UI and the Flutter app themselves.
