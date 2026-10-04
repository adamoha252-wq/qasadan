import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://yrnmyrthjwvstmzxkzwf.supabase.co';
const SERVICE_KEY = 'sb_secret_ooa9jWjrX4M49kGujZJp9A_6DVP-seF';
const BUCKET = 'uploads';
const COVERS_DIR = '/home/z/my-project/scripts/covers';
const MAPPING_OUT = '/home/z/my-project/scripts/cover-urls.json';

// cover file -> { model: 'project'|'article', slug: string }
const TARGETS = {
  'project-irrdo.png': { model: 'project', slug: 'irrdo' },
  'project-al-huda-school.png': { model: 'project', slug: 'al-huda-school' },
  'project-waayo-studio.png': { model: 'project', slug: 'waayo-studio' },
  'project-horn-agritech.png': { model: 'project', slug: 'horn-agritech' },
  'article-web-trends-2026.png': { model: 'article', slug: '5-web-trends-east-african-businesses-2026' },
  'article-al-huda-build.png': { model: 'article', slug: 'how-we-built-al-huda-admissions' },
  'article-accessible-design.png': { model: 'article', slug: 'qasadan-guide-accessible-web-design' },
  'article-digital-lab.png': { model: 'article', slug: 'qasadan-opens-new-digital-lab-mogadishu' },
};

async function uploadWebp(bytes, objectPath) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/webp',
      'x-upsert': 'false',
    },
    body: bytes,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`upload failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}

async function main() {
  const mapping = [];
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  for (const [file, target] of Object.entries(TARGETS)) {
    const src = path.join(COVERS_DIR, file);
    if (!fs.existsSync(src)) throw new Error(`missing source: ${file}`);

    // Compress PNG -> WebP (quality 82, slight downscale keeps text crisp)
    const webp = await sharp(src).webp({ quality: 82 }).toBuffer();
    const objectPath = `${year}/${month}/${randomUUID()}.webp`;

    await uploadWebp(webp, objectPath);
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;

    // Verify the public URL actually resolves (bucket must be public)
    const check = await fetch(publicUrl, { method: 'HEAD' });
    if (!check.ok) throw new Error(`public URL check failed (${check.status}) for ${file}`);

    mapping.push({ ...target, file, url: publicUrl, kb: Math.round(webp.length / 1024) });
    console.log(`uploaded ${file} -> ${Math.round(webp.length / 1024)} KB  ${objectPath}`);
  }

  fs.writeFileSync(MAPPING_OUT, JSON.stringify(mapping, null, 2));
  console.log(`\nmapping saved: ${MAPPING_OUT}`);
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
