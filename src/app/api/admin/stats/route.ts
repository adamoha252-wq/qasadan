import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/crud-helpers";

/** Dashboard aggregate stats. */
export async function GET() {
  return withAdmin(async () => {
    const [
      services,
      projects,
      publishedProjects,
      articles,
      publishedArticles,
      team,
      testimonials,
      inquiries,
      newInquiries,
      recentInquiries,
    ] = await Promise.all([
      db.service.count(),
      db.project.count(),
      db.project.count({ where: { isPublished: true } }),
      db.newsArticle.count(),
      db.newsArticle.count({ where: { isPublished: true } }),
      db.teamMember.count(),
      db.testimonial.count(),
      db.inquiry.count(),
      db.inquiry.count({ where: { status: "NEW" } }),
      db.inquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        services,
        projects,
        publishedProjects,
        articles,
        publishedArticles,
        team,
        testimonials,
        inquiries,
        newInquiries,
      },
      recentInquiries,
    });
  });
}
