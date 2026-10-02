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
