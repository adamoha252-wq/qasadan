/**
 * One-time migration: new settings (real phone numbers) + seed data
 * for SiteStat, PricingPlan, Partner tables (admin-editable content).
 */
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.yrnmyrthjwvstmzxkzwf:21OLu97TWJBJm1GL@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

function cuid() {
  return 's' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

async function upsertSetting(key, value) {
  await client.query(
    `INSERT INTO "SiteSetting" (id, key, value, "updatedAt") VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE SET value = $3, "updatedAt" = now()`,
    [cuid(), key, value]
  );
}

async function main() {
  await client.connect();

  // 1. Settings — real phone numbers + WhatsApp
  await upsertSetting('contact.phone', '+252 612 307 888');
  await upsertSetting('contact.phoneAlt', '+212 617 734 376');
  await upsertSetting('contact.whatsapp', '252612307888');
  console.log('✓ Settings updated (phones + WhatsApp)');

  // 2. Site stats (only if table empty)
  const statCount = await client.query('SELECT COUNT(*)::int AS n FROM "SiteStat"');
  if (statCount.rows[0].n === 0) {
    const stats = [
      ['50+', 'Projects Delivered', 0],
      ['40+', 'Happy Clients', 1],
      ['6+', 'Years of Experience', 2],
      ['24/7', 'Support & Maintenance', 3],
    ];
    for (const [value, label, order] of stats) {
      await client.query(
        `INSERT INTO "SiteStat" (id, value, label, "order", "isActive", "updatedAt") VALUES ($1, $2, $3, $4, true, now())`,
        [cuid(), value, label, order]
      );
    }
    console.log('✓ Seeded 4 hero stats');
  } else {
    console.log('• SiteStat already has rows, skipping');
  }

  // 3. Pricing plans (only if empty)
  const planCount = await client.query('SELECT COUNT(*)::int AS n FROM "PricingPlan"');
  if (planCount.rows[0].n === 0) {
    const plans = [
      {
        name: 'Starter', tagline: 'Perfect for small businesses & startups',
        price: '$299', period: 'per project', isFeatured: false, ctaLabel: 'Choose Starter',
        features: ['5-page responsive website', 'Basic SEO setup', 'Contact form & WhatsApp integration', '1-year free hosting', 'Email support'],
        order: 0,
      },
      {
        name: 'Professional', tagline: 'Most popular — for growing companies',
        price: '$699', period: 'per project', isFeatured: true, ctaLabel: 'Choose Professional',
        features: ['Unlimited pages & custom design', 'Advanced SEO + Google Analytics', 'Admin dashboard & CMS', 'Payment gateway integration', '2-year hosting + SSL certificate', 'Priority email & phone support'],
        order: 1,
      },
      {
        name: 'Enterprise', tagline: 'Custom solutions for large organizations',
        price: 'Custom', period: 'quote', isFeatured: false, ctaLabel: 'Request a Quote',
        features: ['Custom web applications', 'Cloud infrastructure & DevOps', 'Dedicated project team', 'API & systems integration', '24/7 SLA-backed support', 'On-site training & workshops'],
        order: 2,
      },
    ];
    for (const p of plans) {
      await client.query(
        `INSERT INTO "PricingPlan" (id, name, tagline, price, period, features, "isFeatured", "ctaLabel", "order", "isActive", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, true, now())`,
        [cuid(), p.name, p.tagline, p.price, p.period, JSON.stringify(p.features), p.isFeatured, p.ctaLabel, p.order]
      );
    }
    console.log('✓ Seeded 3 pricing plans');
  } else {
    console.log('• PricingPlan already has rows, skipping');
  }

  // 4. Partners (only if empty)
  const partnerCount = await client.query('SELECT COUNT(*)::int AS n FROM "Partner"');
  if (partnerCount.rows[0].n === 0) {
    const partners = [
      ['IRRDO — Institute of Research & Development', 'Research / NGO', 'https://irrdo.org', 0],
      ['Al-Huda Primary & Secondary School', 'Education', null, 1],
    ];
    for (const [name, category, websiteUrl, order] of partners) {
      await client.query(
        `INSERT INTO "Partner" (id, name, category, "websiteUrl", "order", "isActive", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, now())`,
        [cuid(), name, category, websiteUrl, order]
      );
    }
    console.log('✓ Seeded 2 partners');
  } else {
    console.log('• Partner already has rows, skipping');
  }

  await client.end();
  console.log('\nAll done!');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
