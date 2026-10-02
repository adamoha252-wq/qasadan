import Link from "next/link";
import { Briefcase, FolderKanban, Newspaper, Inbox, ArrowRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InquiryStatusBadge } from "@/components/admin/ui-bits";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  const [
    serviceCount,
    projectCount,
    publishedProjectCount,
    articleCount,
    publishedArticleCount,
    inquiryCount,
    newInquiryCount,
    recentInquiries,
  ] = await Promise.all([
    db.service.count(),
    db.project.count(),
    db.project.count({ where: { isPublished: true } }),
    db.newsArticle.count(),
    db.newsArticle.count({ where: { isPublished: true } }),
    db.inquiry.count(),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, subject: true, status: true, createdAt: true },
    }),
  ]);

  const stats = [
    { label: "Services", value: serviceCount, sub: "active", href: "/admin/services", icon: Briefcase },
    { label: "Projects", value: projectCount, sub: `${publishedProjectCount} published`, href: "/admin/portfolio", icon: FolderKanban },
    { label: "Articles", value: articleCount, sub: `${publishedArticleCount} published`, href: "/admin/news", icon: Newspaper },
    { label: "Inquiries", value: inquiryCount, sub: `${newInquiryCount} new`, href: "/admin/inquiries", icon: Inbox },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy-800 sm:text-3xl">
          Welcome back, {user?.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the QASADAN website content from here.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-cyan-600" aria-hidden="true" />
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <span className="font-heading text-3xl font-bold text-navy-800">{stat.value}</span>
                <span className="text-xs text-slate-400">{stat.sub}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent inquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-navy-800">Recent inquiries</CardTitle>
            <Link
              href="/admin/inquiries"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              View all
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentInquiries.length === 0 ? (
              <p className="text-sm text-slate-400">No inquiries yet.</p>
            ) : (
              recentInquiries.map((inq) => (
                <Link
                  key={inq.id}
                  href="/admin/inquiries"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 transition-colors hover:border-cyan-200 hover:bg-cyan-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-800">
                      {inq.name}
                      {inq.subject && <span className="ml-2 text-xs font-normal text-slate-400">{inq.subject}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(inq.createdAt)}</p>
                  </div>
                  <InquiryStatusBadge status={inq.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy-800">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "New project", href: "/admin/portfolio/new" },
              { label: "Write article", href: "/admin/news/new" },
              { label: "Add service", href: "/admin/services" },
              { label: "Edit settings", href: "/admin/settings" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-14 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-medium text-navy-800 transition-colors hover:border-cyan-300 hover:bg-cyan-50/50"
              >
                {action.label}
                <ArrowRight className="h-4 w-4 text-cyan-600" aria-hidden="true" />
              </Link>
            ))}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-medium text-navy-800 transition-colors hover:border-cyan-300 hover:bg-cyan-50/50 sm:col-span-2"
            >
              View public website
              <ExternalLink className="h-4 w-4 text-cyan-600" aria-hidden="true" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
