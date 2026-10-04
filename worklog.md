
---
Task ID: speed-images-launch
Agent: main (Super Z)
Task: Fix slow site speed + add cover images (live on qasadan.vercel.app)

Work Log:
- Diagnosed slowness: all public pages had dynamic="force-dynamic" => full SSR (US function + IE DB) every visit, ~2s TTFB
- Converted all public pages to ISR (revalidate=60); [slug] pages get generateStaticParams (SSG); sitemap revalidate=3600
- Moved news/portfolio category filtering into client components (news-browser.tsx, portfolio-browser.tsx) so listing pages cache statically
- Added withAdminR (revalidating wrapper) to all 19 admin mutation handlers via crud-helpers; new src/lib/revalidate.ts
- Local build verified (all public routes Static/SSG in prerender-manifest)
- Deploys were BLOCKED on Vercel: commit author email z@con.tainer invalid. Fixed: git config user.email=336814347+adamoha252-wq@users.noreply.github.com, pushed e59bd97
- Generated 8 brand cover images (image-gen skill), compressed to WebP via sharp (31-91KB), uploaded to Supabase uploads bucket (2026/10/uuid.webp), set coverImage on 4 projects + 4 articles
- VERIFIED LIVE: homepage TTFB 2s -> 0.04-0.27s; x-vercel-cache HIT/PRERENDER; all pages 200; filters work; admin login + settings PUT (no-op) 200 => instant-refresh pipeline works; covers render on home/portfolio/news

Stage Summary:
- Speed fix live: 4-40x faster pages, edge-cached globally, CMS saves refresh instantly
- 8 AI cover images live on all content pages
- Remaining for user: change default admin password online, revoke GitHub PAT, optional custom domain + Search Console
