const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.yrnmyrthjwvstmzxkzwf:21OLu97TWJBJm1GL@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // Settings
  const settings = await client.query('SELECT key, value FROM "SiteSetting" ORDER BY key');
  console.log('=== SETTINGS ===');
  settings.rows.forEach(r => console.log(`  ${r.key}: ${String(r.value).substring(0, 120)}`));

  // Tables and counts
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  console.log('\n=== TABLES ===');
  for (const t of tables.rows) {
    const name = t.table_name;
    if (name.includes('_prisma') || name.includes('migrations')) continue;
    try {
      const c = await client.query(`SELECT COUNT(*)::int as n FROM "${name}"`);
      console.log(`  ${name}: ${c.rows[0].n} rows`);
    } catch (e) {
      console.log(`  ${name}: error`);
    }
  }

  // Team members
  try {
    const team = await client.query('SELECT name, role, bio FROM "TeamMember" ORDER BY "order" LIMIT 10');
    console.log('\n=== TEAM ===');
    team.rows.forEach(r => console.log(`  ${r.name} — ${r.role}`));
  } catch (e) { console.log('\n=== TEAM ===', e.message.substring(0, 100)); }

  // Testimonials
  try {
    const t = await client.query('SELECT "clientName", "clientRole", approved FROM "Testimonial" LIMIT 10');
    console.log('\n=== TESTIMONIALS ===');
    t.rows.forEach(r => console.log(`  ${r.clientName} (${r.clientRole}) approved=${r.approved}`));
  } catch (e) { console.log('\n=== TESTIMONIALS ===', e.message.substring(0, 100)); }

  // Services
  try {
    const s = await client.query('SELECT title, description FROM "Service" ORDER BY "order" LIMIT 15');
    console.log('\n=== SERVICES ===');
    s.rows.forEach(r => console.log(`  ${r.title}: ${String(r.description||'').substring(0,60)}`));
  } catch (e) { console.log('\n=== SERVICES ===', e.message.substring(0, 100)); }

  await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
