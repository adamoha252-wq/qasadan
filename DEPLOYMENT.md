# QASADAN — Production Deployment Guide

This guide covers deploying the QASADAN website + CMS to production.
The stack is **Next.js 16 (standalone) + Prisma + custom session auth + local file storage**,
designed so each infrastructure piece can be swapped to a managed service (Supabase,
Neon, S3) with minimal code changes.

> **Security first — before going live:**
> 1. Change the default admin password: sign in at `/admin/login`, open
>    **Settings → Account security**, and set a new password (no command line needed).
> 2. Set a strong, unique `DATABASE_URL`.
> 3. Serve over HTTPS only (Vercel does this automatically).

---

## 1. Deploy to Vercel (recommended path)

### Steps

1. Push the repository to GitHub/GitLab.
2. In Vercel: **Add New → Project** and import the repo.
3. Framework preset: **Next.js** (auto-detected). Build command `next build` (default).
4. Set **Environment Variables** (Production + Preview):
   - `DATABASE_URL` — a serverless-friendly Postgres connection string (see §2).
5. Deploy.
6. Add your custom domain: **Settings → Domains → Add**, point your DNS:
   - Apex (`qasadan.com`): `A` record → `76.76.21.21`
   - Subdomain (`www`): `CNAME` → `cname.vercel-dns.com`
7. Update the canonical URL in `src/lib/site.ts` (`url: "https://your-domain.com"`)
   and the `siteConfig.url` reference, then redeploy.

### Notes for Vercel

- **Database**: Vercel is serverless — SQLite (file storage) will NOT persist there.
  Use Postgres (§2). All Prisma models are already portable.
- **File uploads**: Vercel's filesystem is ephemeral. Either mount S3-compatible
  storage (§4) or use the Vercel Blob / Supabase Storage adapter in `src/lib/storage.ts`.
- **Rate limiter**: `src/lib/auth/rate-limit.ts` is in-memory (per-instance). On
  serverless, swap for Upstash Redis or Vercel KV — the interface is 3 functions.

---

## 2. Database options

### Option A — Supabase Postgres (closest to the original spec)

> **Status: DONE in this repository** — the Prisma schema already uses
> `provider = "postgresql"` and the production Supabase project is seeded.
> Keep these steps as the reference for a fresh setup.

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **connection pooler** URI (port 6543, `pgbouncer=true`) — IPv4-friendly.
3. `prisma/schema.prisma` already has `provider = "postgresql"`.
4. Run:
   ```bash
   bun install
   bunx prisma db push
   bun run db:seed
   ```
5. Set `DATABASE_URL` in Vercel and deploy.

> The data-access layer (`src/lib/data/public.ts`) and all APIs are provider-agnostic;
> no query changes are needed. The string-JSON columns (features/technologies) work
> identically on Postgres.

### Option B — Any Postgres (Neon / Railway / RDS)

Same steps as A with your provider's URL.

### Option C — Keep SQLite (single VPS / Docker)

Works as-is with `DATABASE_URL=file:...` on a persistent volume.

---

## 3. Authentication in production

Auth is self-contained (scrypt + DB sessions + httpOnly cookies) — no external
provider needed. Production checklist:

- Cookies automatically switch to `Secure` when `NODE_ENV=production`.
- Sessions expire after 7 days (sliding renewal at <2 days).
- On serverless, Prisma client needs `import 'prisma/server-only'` protections
  already in place — no changes required.

### Rotate / change the admin password

**Preferred (built-in UI):** sign in at `/admin/login`, go to **Settings →
Account security**, and use the "Update password" form. Requirements: at least
10 characters including a letter and a number. Changing the password also logs
out all other devices.

**Fallback (CLI, e.g. if you lost the password):**

```bash
# Generate a new hash (runs scrypt):
bun -e 'import {hashPassword} from "./src/lib/auth/password"; console.log(hashPassword("YOUR-NEW-PASSWORD"))'
```

Then update the admin row:

```sql
UPDATE AdminUser SET passwordHash = 'PASTE-HASH-HERE' WHERE email = 'admin@qasadan.com';
```

---

## 4. File storage

Uploads live in `storage/uploads/**` and are served via `/api/media/*`
(path-traversal-proof, MIME-validated, immutable caching).

- **Serverless (Vercel) — built-in Supabase Storage support:** set these env
  vars and uploads are stored in a Supabase Storage bucket instead of local
  disk (the local disk is ephemeral on serverless):
  - `SUPABASE_URL` — e.g. `https://<project-ref>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API
  - `MEDIA_BUCKET` — optional, defaults to `uploads` (create it once in
    Supabase → Storage → New bucket, **Public**)

  The CMS stores whatever URL the upload endpoint returns — in cloud mode a
  permanent Supabase public URL. Deletion of cloud objects is handled by the
  same admin API. No code changes needed.
- **VPS/Docker**: local-disk mode works as-is on a persistent volume.
- **Other object stores (S3, R2)**: swap the internals of `src/lib/storage.ts`
  (`storeUpload`, `deleteMediaFile`) keeping the same signatures.

---

## 5. Environment variables

See `.env.example`. Only `DATABASE_URL` is required.

---

## 6. Post-deploy smoke test

```bash
# Public site
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/            # 200
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/sitemap.xml # 200
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/robots.txt  # 200

# Admin protection
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/admin       # 307 redirect
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/api/admin/auth/me  # 401
```

Then log in at `https://YOUR-DOMAIN/admin/login`, change the admin password
(Settings → Account security), and update site settings (email/phone/socials)
at `/admin/settings`.

---

## 7. Updating the site URL for SEO

`src/lib/site.ts → siteConfig.url` drives canonical URLs, sitemap, and OG tags.
Set it to the final domain before launch.

## 8. Payments (Phase 1 — Payment Providers)

Admin → **Settings → Payment Providers** manages the connected payment
gateways (WAAFI Pay first; SoomarPay/PayPal are framework-ready).

**Security model**

- Provider credentials (HPP keys, API keys…) are encrypted with
  **AES-256-GCM** before they touch the database (`src/lib/payments/crypto.ts`)
  and are decrypted only inside server code. The browser only ever receives
  masked values (`••••••••7f3a`).
- The encryption key comes from the `PAYMENTS_MASTER_KEY` env var
  (generate with `openssl rand -base64 32`). Set it in **Vercel → Project →
  Settings → Environment Variables** before configuring providers in
  production. Keep a backup — changing it invalidates stored credentials.
- The admin API for providers is restricted to the `ADMIN` role.

**Deploy checklist for the payments phase**

1. `bunx prisma db push` (adds the `PaymentProvider` table — additive, safe).
2. Set `PAYMENTS_MASTER_KEY` in the hosting environment (Vercel).
3. Redeploy, then configure the provider in the admin panel and run
   **Test Connection** (a live, read-only WAAFI Pay authentication check).

## 9. Payments (Phase 2 — Invoices & Secure Links)

Admin → **Invoices** creates invoices and hands out the client payment link
`/pay/<token>` (192-bit random, base64url). Unknown tokens return a generic
404, the page is `noindex` and never cached (`force-dynamic`).

**Security model**

- The token in the URL is the authorization (same model as Stripe payment
  links). Treat the link like a password when sharing it.
- The public pay page only shows client name + invoice facts — never the
  client email or internal ids.
- Status transitions are server-controlled: admins can only cancel a
  PENDING invoice; every other transition belongs to the payment flow
  (later phase). Paid/processing invoices cannot be edited or deleted.
- Invoice currencies are validated against the provider registry
  (currently WAAFI Pay: USD, SLSH, DJF).

**Deploy checklist for Phase 2**

1. `bunx prisma db push` (adds the `Invoice` table — additive, safe).
2. No new environment variables (reuses `PAYMENTS_MASTER_KEY`).
3. Redeploy — the admin sidebar gains an **Invoices** entry.

## 10. Payments (Phase 3 — Client Checkout)

The public `/pay/<token>` page now shows the **payment provider and method
selection** (only providers the admin ACTIVATED, with complete credentials
and a currency match) plus **Pay Now**. The customer picks a provider, then
a method (wallet methods also ask for the mobile number — WAAFI
`payerInfo.subscriptionId`, pre-filled and non-editable on the provider's
page), then pays on the provider's **hosted checkout page**
(`HPP_PURCHASE` → `params.hppUrl` per docs.waafipay.com/hpp-api).

**Flow & guarantees**

- Public API: `POST /api/pay/[token]/pay` (token = authorization). The
  server re-validates everything: invoice state, provider activation,
  enabled method, currency, phone format (zero frontend trust).
- Anti-double-pay: one in-flight checkout attempt per invoice — repeat
  clicks return the SAME hosted-checkout URL (idempotent). Concurrent
  clicks are serialized by a conditional `PENDING → PROCESSING` claim;
  if the provider rejects the request, the invoice self-heals to PENDING
  and the failed attempt is kept as an audit record.
- Provider callbacks: `/api/pay/callback?ref=…&result=success|failure`
  (registered as `hppSuccessCallbackUrl` / `hppFailureCallbackUrl`,
  `hppRespDataFormat=2`). Always HTTP 200. UNTRUSTED — a success callback
  only records data and keeps the invoice PROCESSING; the PAID transition
  happens exclusively in the server-side verification (Phase 4: webhook
  HMAC + `HPP_GETTRANINFO`). A failure callback releases the invoice back
  to PENDING so the customer can retry.
- Rate limit: 5 real initiation attempts per invoice token / 10 minutes
  (in-memory, per instance — same caveat as the login limiter).
- `Payment` table: one row per attempt (referenceId `QSD-<invoice>-<hex>`,
  provider snapshot, method, amount, currency, status, hppUrl, callback
  data, failure reason). Deleting a provider keeps payment history
  (snapshot fields, no FK).

**Deploy checklist for Phase 3**

1. `bunx prisma db push` (adds the `Payment` table + `Invoice.payments`
   relation — additive, safe).
2. No new environment variables.
3. The site must be reachable over **HTTPS** (WAAFI requires HTTPS
   callback URLs — true on Vercel).
4. Real WAAFI Pay merchant credentials must be configured and tested in
   Admin → Settings → Payment Providers (sandbox creds currently produce
   a clean "rejected the credentials" error on purpose).

## 11. Payments (Phase 4+5 — Verification, Receipts, Webhooks, History)

What was added:

- **Server-side verification (zero frontend trust)** — `POST /api/pay/<token>/verify`
  asks WAAFI Pay directly (`HPP_GETTRANINFO`, by our unique `referenceId`)
  whether the transaction we initiated was approved. The PAID transition
  requires ALL of: provider reports status "Approved", provider-reported
  amount + currency match the attempt, and the idempotent conditional
  updates (`updateMany`) win the race. Duplicate verifications, concurrent
  webhook + client checks and replayed events can never double-process a
  payment. Verification errors (provider unreachable / bad credentials)
  NEVER change any state — an infrastructure problem is not a payment
  failure. On a definitive negative outcome (declined / cancelled /
  timeout / expired) the attempt is marked FAILED and the invoice returns
  to PENDING so the customer can retry.
- **Amount/currency mismatch** — the attempt keeps its open status (new
  initiations stay blocked — no double payment) and the discrepancy is
  recorded on the attempt for admin review (visible in the payment
  history); the invoice stays PROCESSING until an admin uses the Release
  action if appropriate.
- **Success page (spec §7)** — a paid `/pay/<token>` shows the
  "✓ Payment Successful" panel with invoice number, amount, provider +
  method, transaction ID and date, plus **Download Receipt** (PDF) and
  **View Invoice** buttons. While an invoice is PROCESSING, a
  "Check payment status" panel lets the customer (or the automatic
  return from the provider's page) trigger verification.
- **PDF receipts** — `GET /api/pay/<token>/receipt` renders a branded A4
  receipt (pdf-lib) for PAID invoices only; everything else gets the same
  generic 404 (no existence leak).
- **Signed webhooks** — `POST /api/pay/webhook/waafipay`. WAAFI sends
  `X-Webhook-Signature` = lowercase-hex HMAC-SHA256 over
  `{X-Webhook-Timestamp}.{X-Webhook-Event-Id}.{raw body}` with the secret
  issued once at webhook registration. Verification: constant-time HMAC
  compare, 5-minute replay window, event-id dedupe, unsigned `webhook.test`
  pings answered with 200. ZERO-TRUST: the payload only supplies our own
  `payment.reference_id` — the PAID decision is always re-made against
  the provider API. The endpoint always returns 200 (no leak).
- **Admin payment history (spec §8)** — Admin → Payments: every attempt
  with invoice, client, provider, method, amount, reference + provider
  transaction IDs, status and date; search + status/provider filters;
  detail dialog with the full verification trail; receipt download for
  verified payments.
- **Admin release tool** — a PROCESSING invoice whose session can never
  conclude can be released back to PENDING (Invoices → ⋯ → Release).
  Refuses when a verified payment exists.

New environment variables: none required. Optional:

- `WAAFIPAY_SANDBOX_URL` / `WAAFIPAY_PRODUCTION_URL` — override the
  provider API endpoints (defaults: the official sandbox/production URLs).
  Only for corporate proxies or automated end-to-end tests.

New dependency: `pdf-lib` (receipt generation).

**Registering the webhook (optional but recommended)**

1. In your WAAFI Pay merchant account (or via the `WEBHOOK_REGISTER`
   service), register the URL: `https://<your-domain>/api/pay/webhook/waafipay`
2. WAAFI shows the signing secret ONCE — copy it immediately.
3. Admin → Settings → Payment Providers → WAAFI Pay → Configure → paste
   it into **Webhook Secret** and save (AES-256-GCM encrypted at rest).

**Deploy checklist for Phase 4+5**

1. `bunx prisma db push` (adds `Payment.payerAccount`, `Payment.verifiedAt`,
   `Payment.verificationData` — additive, safe).
2. No new environment variables (set the webhook secret in the admin UI).
3. HTTPS (already true on Vercel) — required for webhook callbacks.

**End-to-end tests (local)** — `bash scripts/pay-phase45-e2e.sh` runs the
full suite (131 checks) against a local mock of the WAAFI `/asm` endpoint
(`scripts/pay-mock-waafi.ts`), then restarts the dev server clean and
re-checks the real sandbox connectivity + public pages.
`bun scripts/pay-phase45-demo-seed.ts` seeds demo paid/processing
invoices for manual preview (local DB only).

## 12. Payments (Phase 6 — Public Plan Checkout)

The pricing section's "Choose Plan" button now lets public visitors order a
plan online: `/checkout/<planId>` collects the buyer's name/email, creates a
PENDING invoice server-side (`POST /api/checkout/plan`), and redirects to the
existing `/pay/<token>` secure checkout where the customer selects the
provider and payment method (WAAFI Pay → Mobile Wallet, card or bank).

- **No schema changes, no new environment variables** — reuses the invoice
  pipeline end-to-end. Nothing to migrate.
- Plans with a numeric price ("$150", "SLSH 50,000") become orderable; plans
  with non-numeric prices ("Custom") keep linking to the contact page.
- Zero-trust: the plan, price and currency are re-parsed server-side on every
  order; the public endpoint is per-IP rate-limited (5 orders / 10 min).
- Plan orders appear in Admin → Invoices like any invoice
  (project service: "<Plan Name> Plan").
- Local test: `bash scripts/plan-checkout-e2e.sh` (37 checks).
