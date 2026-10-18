# ASPIRE LMS — security audit and hardening report

Date: 18 October 2026. Scope: the whole repository (Next.js 15.5.28 App Router, Supabase Auth + Postgres + Storage, Paystack).

## 1. What the system is

| Area | What exists |
|---|---|
| Sign-in | Supabase Auth, email + password, email-link callback (`/auth/callback`). Session in `@supabase/ssr` cookies. |
| Roles | `profiles.role` = learner \| admin. `profiles.company_role` = owner \| member. No instructor role. |
| Data access | Server code uses the **service-role key** (bypasses RLS), so the application code is the main security boundary. RLS is the second layer for anything using the anon key. |
| Server entry points | Route handlers: `/api/learn`, `/api/certificate/[serial]`, `/api/pay/callback`, `/api/pay/webhook`, `/auth/callback`. Server actions in `app/actions.ts`, `app/pay-actions.ts`, `app/company-actions.ts`, `app/admin/actions.ts`. Middleware: session refresh, sign-in gate, CSP. |
| Payments | Paystack: certificates (per course) and company seats (per year). Card in USD, M-Pesa in KES. |
| Demo mode | **Removed.** Without Supabase keys every route returns 503 "not configured". |

## 2. Findings and status

| ID | Severity | Finding | Status |
|---|---|---|---|
| C1 | Critical | RLS let users update their own `profiles` row, including `email` and `company_role`. A member could make themselves company owner; anyone could set their profile email to the admin's and be promoted by `npm run seed`, which matched on `profiles.email`. | **Fixed.** Policy dropped (all writes go through the server). Seed now promotes the confirmed `auth.users` account by exact email. |
| H1 | High | Module knowledge checks returned the correct options; the final exam reuses those questions, so certificates could be earned by copying answers. | **Fixed.** Checks return right/wrong per question only. |
| H2 | High | Open redirect: `next=/\evil.com` passed the check and resolved to `https://evil.com` (auth callback, sign-in form, profile form). | **Fixed.** Central `safeNext()`. |
| H3 | High | Demo mode switched on whenever the Supabase URL was missing; one misconfigured deploy gave everyone one-click admin. | **Fixed.** Demo mode deleted; missing config fails closed (503). |
| M1 | Medium | Learning API: no module-order check, no input validation, modules completed without viewing slides, exam lacked an explicit enrolment check. | **Fixed.** Zod validation, order + enrolment checks, slide-view requirement. |
| M2 | Medium | Certificate PDF fetched brand images from a URL built from the `Host` header (server-side request forgery on self-hosting). | **Fixed.** Read from disk. |
| M3 | Medium | Admin-entered video URL went straight into `<iframe src>` (`javascript:` → stored XSS). | **Fixed.** https allow-list on save and render, sandboxed iframe. |
| M4 | Medium | No rate limiting; 8-hex-character invite codes could be guessed. | **Fixed.** Postgres-backed limits on exam, quiz, progress, join, payment start, PDF, verify. New invite codes are 16 hex characters. |
| M5 | Medium | No Content-Security-Policy; Supabase session cookies are readable by JavaScript by design, so any XSS would steal sessions. | **Fixed.** Per-request nonce CSP with `strict-dynamic`, HSTS, COOP. Verified in Chromium: zero violations, pages interactive. |
| M6 | Medium | Dependency advisories. | **Partly fixed.** `@supabase/supabase-js` 2.118.0 + `@supabase/ssr` 0.12.7. `next` (moderate), `postcss` and `sharp` (high, via Next) need Next 16 — **open**. |
| M7 | Medium | No MFA for admins; no suspend-user feature. | **Open** (see §6). |
| L1 | Low | `slides` bucket is public: slide images are readable without enrolment. Consistent with "free to learn". | **Open, by design.** |
| L2 | Low | Assignments could be filed against any course. | **Fixed.** |
| L3 | Low | Simultaneous joins could exceed seats. | **Fixed** (fail-safe undo). |
| L4 | Low | Webhook returned 500 on bad JSON; `applyPayment` trusted callers to check status; failed payments could be revived. | **Fixed.** Refunds/chargebacks still not handled automatically — **open**. |
| L5 | Low | 8-character password minimum is enforced only in the browser. | **Open** — set in the Supabase dashboard (§7). |

## 3. Payment integrity (verified by tests)

* Payment success is decided only by Paystack's server-side `GET /transaction/verify/:reference`, never by the browser or the webhook body.
* The verified transaction must have `status = success`, **the same reference**, and **the exact amount (subunits) and currency** stored when the payment was created. Underpayment or wrong currency marks the payment `failed`, permanently.
* Prices come from the database (`courses.certificate_price_usd`, `settings.seat_price_usd`); extra price/amount fields in the form are ignored. M-Pesa KES is computed on the server.
* Webhooks require a valid HMAC-SHA512 signature (timing-safe compare) with the secret key.
* Applying a payment is idempotent: an outer "already paid" check stops replays, and a conditional update (`status <> success`) lets only one of several simultaneous deliveries apply it. Certificates are unique per learner and course.
* Unknown references, failed or abandoned transactions and mismatched references change nothing.

## 4. Automated tests

`npm run test:security` runs 85 tests in `tests/security/`. They call the **real** route handlers, server actions and middleware. The only stand-ins are an in-memory Supabase double (`tests/support/fake-supabase.ts`, never imported by the app), Next's request cookies/headers, and Paystack's HTTP API.

| File | Proves |
|---|---|
| `payments.test.ts` | Forged/unsigned webhooks rejected; unconfirmed, underpaid, wrong-currency, wrong-reference and previously failed payments rejected; duplicate, concurrent and replayed deliveries applied once and never roll back newer data; the browser callback isn't proof of payment; prices come from the server. |
| `access.test.ts` | Anonymous and expired/revoked sessions rejected by the API, PDF route and every server action; learners, owners and members can't run any admin action or smuggle role/company/email into profile updates; nobody can download another person's certificate; no writes into courses the user isn't enrolled in; company isolation; invite-code guessing is rate limited; simultaneous joins never exceed seats. |
| `learning.test.ts` | Answer keys never leave the server; grading ignores client-sent scores; module order, enrolment and slide viewing enforced; malformed input → 400/413; exam rate limit. |
| `boundaries.test.ts` | Open-redirect cases; video allow-list; middleware fails closed and sets a nonce CSP; schema gives users no direct write access, questions are admin-only; no service key or secrets in browser code; no demo endpoints; safe admin seeding. |

**The tests were checked against deliberately broken code.** Each protection was removed in turn (signature check, amount/currency check, reference check, idempotent claim, answer-key stripping, admin check, PDF ownership, module order, enrolment, company scoping, redirect guard, session check, server-side price, rate limit, assignment enrolment) and the suite failed every time. One redundant line (the URL-origin check in `safeNext`) is not independently detectable, because earlier rules already block every case.

## 5. What these tests do NOT verify

* **Supabase Row Level Security at runtime.** The double does not execute Postgres policies. The schema is checked statically; run the RLS checks in §7 against a staging project.
* **Supabase Auth itself** (token signing, expiry, refresh, password brute-force limits, email enumeration behaviour).
* **Live Paystack** (real webhook payloads, M-Pesa flow, Paystack's own retries). Test in Paystack test mode before going live.
* **The real database rate-limit function** (`hit_rate_limit`) — logic tested via the double only.
* **Hosting-level behaviour** (Vercel `x-forwarded-for`, HSTS on the custom domain).

## 6. Remaining risks

1. **Next.js advisories** (moderate in `next`, high in bundled `postcss`/`sharp`) — fixed only in Next 16. `sharp` is used by Next's image optimiser, which this app doesn't use. Plan the upgrade.
2. **No admin MFA.** A stolen admin password gives full control. Enable Supabase TOTP MFA and require AAL2 for `/admin`.
3. **No suspend button.** To cut someone off, ban the user in Supabase Auth (Dashboard › Authentication › Users), which invalidates their sessions; remove admin role in Admin › Learners.
4. **Refunds and chargebacks** don't revoke certificates or seats. Revoke manually in Admin › Certificates / Companies.
5. **Knowledge checks + unlimited retakes** still let a determined learner find answers by trial (≤4 tries per question), now slowed by rate limits. A separate final-exam question bank would close this fully.
6. **Slide progress is self-reported** by the browser; a determined learner can mark slides viewed without reading them.
7. **Rate limiting fails open** if the `hit_rate_limit` function is missing (logged as `[rate-limit] unavailable`), so a missed migration can't block exams.
8. **Public slides bucket** (L1).
9. **Existing 8-character invite codes** keep working; regenerate them if a company is concerned.

## 7. Production deployment checklist

- [ ] Run the latest `supabase/schema.sql` (safe to re-run): drops the profile-update policy, adds `rate_limits` + `hit_rate_limit`, lengthens invite codes.
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (https), `PAYSTACK_SECRET_KEY`, `USD_TO_KES`, `ADMIN_EMAIL` in Vercel. Never prefix the service key or Paystack key with `NEXT_PUBLIC_`.
- [ ] Paystack dashboard: webhook URL `https://<domain>/api/pay/webhook`; test mode first.
- [ ] Supabase Auth: confirm email ON; minimum password length 8+; leaked-password protection ON; site URL and redirect URLs set to the production domain only.
- [ ] Admin: sign up, confirm the email, run `npm run seed`. Then enable MFA for every admin.
- [ ] Staging RLS check: signed in as a learner with the anon key, confirm `update profiles`, `select questions`, `insert certificates/payments/enrollments` and `rpc hit_rate_limit` are all refused.
- [ ] Make one real low-value Paystack test payment for a certificate and one for seats; confirm a single certificate/seat change, then replay the webhook from the Paystack dashboard and confirm nothing changes.
- [ ] `npm run typecheck && npm run test:security && npm run build` pass in CI.
- [ ] Plan the Next 16 upgrade.

## 8. Files changed

* **Removed (demo mode):** `app/api/demo/*`, `app/preview`, `components/demo-bar.tsx`, `components/demo-picker.tsx`; `lib/demo-db.ts` moved to `tests/support/fake-supabase.ts` as a test double.
* **New:** `lib/config.ts`, `lib/safe-next.ts`, `lib/video.ts`, `lib/rate-limit.ts`, `tests/**`, `vitest.config.ts`, this file.
* **Changed:** `middleware.ts` (fail closed, CSP, HSTS), `lib/supabase.ts`, `lib/supabase-browser.ts`, `lib/certs.ts`, `lib/paystack.ts`, `api/learn`, `api/pay/webhook`, `api/pay/callback`, `api/certificate/[serial]`, `auth/callback`, `actions.ts`, `pay-actions.ts`, `company-actions.ts`, `admin/actions.ts`, `verify/[serial]`, `learn/[slug]/m/[position]`, `quiz.tsx`, `module-player.tsx`, `slide-uploader.tsx`, `auth-form.tsx`, sign-in pages, `layout.tsx` (per-request rendering for the CSP nonce), `supabase/schema.sql`, `scripts/seed.mjs`, `next.config.ts`, `.env.example`, `package.json`.
