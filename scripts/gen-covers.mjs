import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/home/z/my-project/scripts/covers';

// Brand-consistent cover art for QASADAN (navy #0B1F3A + cyan accents)
const COVERS = [
  {
    file: 'project-irrdo.png',
    prompt:
      'Modern institutional research organization website homepage displayed on a sleek laptop screen, clean professional layout with navy blue and white color scheme, sections for research programs and publications, laptop resting on a minimal light desk, soft studio lighting, professional web design portfolio case study mockup, photorealistic, high quality, detailed',
  },
  {
    file: 'project-al-huda-school.png',
    prompt:
      'Modern school website platform displayed on a laptop and a tablet side by side, education website with admissions section and school news feed, navy blue and cyan accents on clean white background, welcoming professional design, minimal desk setup, professional web design portfolio case study mockup, photorealistic, high quality, detailed',
  },
  {
    file: 'project-waayo-studio.png',
    prompt:
      'Creative agency portfolio website on a widescreen monitor, bold modern dark theme design with vibrant cyan accent highlights, portfolio showcase grid layout with large typography, sleek minimal workspace, professional web design case study mockup, photorealistic, high quality, detailed',
  },
  {
    file: 'project-horn-agritech.png',
    prompt:
      'Modern agriculture technology web application dashboard on a laptop screen, clean data charts showing crop yield analytics, green and navy blue user interface, professional minimal workspace, web application case study mockup, photorealistic, high quality, detailed',
  },
  {
    file: 'article-web-trends-2026.png',
    prompt:
      'Abstract futuristic digital technology concept illustration, rising trend arrows and glowing network connection lines over a stylized East African city skyline silhouette at dusk, deep navy blue background with luminous cyan accents, modern flat illustration style, high quality, detailed',
  },
  {
    file: 'article-al-huda-build.png',
    prompt:
      'Developer workspace building an education admissions web platform, code editor with clean code on main monitor and UI wireframe sketches on second monitor, dark room with cyan ambient lighting, professional tech photography style, high quality, detailed',
  },
  {
    file: 'article-accessible-design.png',
    prompt:
      'Inclusive accessible web design concept illustration, laptop showing a high-contrast clean website interface surrounded by floating accessibility symbols and universal design icons, navy blue and cyan color palette, modern flat illustration style, high quality, detailed',
  },
  {
    file: 'article-digital-lab.png',
    prompt:
      'Modern digital laboratory workspace interior for a web agency, rows of desks with dual monitors, usability testing cameras and devices on shelves, bright open office space with navy blue and cyan brand accent walls, professional architectural photography, high quality, detailed',
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const zai = await ZAI.create();

  for (const { file, prompt } of COVERS) {
    const outPath = path.join(OUT_DIR, file);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 20000) {
      console.log(`skip (exists): ${file}`);
      continue;
    }
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const response = await zai.images.generations.create({
          prompt,
          size: '1344x768',
        });
        const b64 = response?.data?.[0]?.base64;
        if (!b64) throw new Error('no image data in response');
        const buffer = Buffer.from(b64, 'base64');
        fs.writeFileSync(outPath, buffer);
        console.log(`generated: ${file} (${Math.round(buffer.length / 1024)} KB)`);
        ok = true;
      } catch (err) {
        console.error(`attempt ${attempt} failed for ${file}: ${err.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    if (!ok) {
      console.error(`FAILED permanently: ${file}`);
      process.exitCode = 1;
    }
  }
  console.log('done');
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
