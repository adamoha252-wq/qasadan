const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.yrnmyrthjwvstmzxkzwf:21OLu97TWJBJm1GL@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
  const t = await client.query('SELECT * FROM "Testimonial" LIMIT 5');
  console.log('=== TESTIMONIALS ===');
  t.rows.forEach(r => console.log(JSON.stringify(r).substring(0, 250)));

  const p = await client.query('SELECT title, slug, "coverImage" IS NOT NULL AND "coverImage" != \'\' AS has_img FROM "Project" LIMIT 10');
  console.log('\n=== PROJECTS ===');
  p.rows.forEach(r => console.log('  ' + r.title + ' (slug: ' + r.slug + ') coverImg: ' + (r.has_img ? 'YES' : 'no')));

  const n = await client.query('SELECT title, slug FROM "NewsArticle" LIMIT 10');
  console.log('\n=== NEWS ===');
  n.rows.forEach(r => console.log('  ' + r.title + ' (' + r.slug + ')'));

  await client.end();
}).catch(e => console.error('ERR:', e.message));
