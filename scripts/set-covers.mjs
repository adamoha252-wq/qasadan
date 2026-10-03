import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const DATABASE_URL =
  'postgresql://postgres.yrnmyrthjwvstmzxkzwf:21OLu97TWJBJm1GL@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const mapping = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/cover-urls.json', 'utf-8'));

async function main() {
  for (const item of mapping) {
    if (item.model === 'project') {
      const res = await prisma.project.updateMany({
        where: { slug: item.slug },
        data: { coverImage: item.url },
      });
      console.log(`project ${item.slug}: updated ${res.count}`);
    } else if (item.model === 'article') {
      const res = await prisma.newsArticle.updateMany({
        where: { slug: item.slug },
        data: { coverImage: item.url },
      });
      console.log(`article ${item.slug}: updated ${res.count}`);
    }
  }
  // Sanity check
  const projects = await prisma.project.findMany({ select: { slug: true, coverImage: true } });
  const articles = await prisma.newsArticle.findMany({ select: { slug: true, coverImage: true } });
  console.log('\nDB state:');
  console.log(projects.map((p) => `${p.slug}: ${p.coverImage ? 'COVER SET' : 'none'}`).join('\n'));
  console.log(articles.map((a) => `${a.slug}: ${a.coverImage ? 'COVER SET' : 'none'}`).join('\n'));
}

main()
  .catch((err) => {
    console.error('fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
