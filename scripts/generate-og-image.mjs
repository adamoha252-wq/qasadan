/**
 * Generates the QASADAN Open Graph image (1200x630) using sharp.
 * Output: public/og-image.png
 */
const sharp = await import("sharp");
const fs = await import("fs");
const sharpLib = sharp.default ?? sharp;

async function main() {
  const W = 1200;
  const H = 630;

  const svg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tail" gradientUnits="userSpaceOnUse" x1="700" y1="330" x2="860" y2="490">
        <stop offset="0" stop-color="#0B1F3A"/>
        <stop offset="1" stop-color="#06B6D4"/>
      </linearGradient>
      <linearGradient id="impact" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#67E8F9"/>
        <stop offset="1" stop-color="#06B6D4"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      </pattern>
    </defs>

    <rect width="${W}" height="${H}" fill="#0B1F3A"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    <circle cx="1050" cy="80" r="260" fill="#06B6D4" opacity="0.08"/>
    <circle cx="120" cy="600" r="200" fill="#06B6D4" opacity="0.06"/>

    <!-- Q mark -->
    <g transform="translate(96, 165) scale(0.62)">
      <circle cx="268" cy="250" r="160" fill="none" stroke="#FFFFFF" stroke-width="74"/>
      <line x1="306" y1="306" x2="452" y2="452" stroke="url(#tail)" stroke-width="58" stroke-linecap="round"/>
      <rect x="58" y="118" width="26" height="26" rx="4" fill="#22D3EE" transform="rotate(-10 71 131)"/>
      <rect x="20" y="180" width="34" height="34" rx="5" fill="#06B6D4" transform="rotate(15 37 197)"/>
      <rect x="56" y="236" width="20" height="20" rx="3" fill="#0E7490"/>
      <rect x="12" y="292" width="40" height="40" rx="6" fill="#155E75" transform="rotate(-18 32 312)"/>
      <rect x="48" y="352" width="26" height="26" rx="4" fill="#0891B2" transform="rotate(22 61 365)"/>
    </g>

    <!-- Wordmark -->
    <text x="500" y="300" font-family="DejaVu Sans, Arial, sans-serif" font-size="96" font-weight="bold" fill="#FFFFFF" letter-spacing="6">QASADAN</text>
    <rect x="505" y="336" width="150" height="4" rx="2" fill="#06B6D4"/>
    <rect x="905" y="336" width="150" height="4" rx="2" fill="#06B6D4"/>
    <text x="600" y="392" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" fill="#22D3EE" letter-spacing="12" text-anchor="middle" transform="translate(180,0)">WEB DEVELOPMENT AGENCY</text>

    <text x="600" y="510" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#8FB0D2" text-anchor="middle" transform="translate(180,0)">Digital solutions engineered for impact</text>
  </svg>`;

  await sharpLib(Buffer.from(svg)).png().toFile("public/og-image.png");
  console.log("✓ public/og-image.png generated");
  const meta = await sharpLib("public/og-image.png").metadata();
  console.log(`  ${meta.width}x${meta.height}`);
}

main().catch((e) => {
  console.error("failed:", e);
  process.exit(1);
});
