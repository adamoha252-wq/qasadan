import Link from "next/link";
import { Briefcase, FolderKanban, Newspaper, Inbox, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  const [serviceCount, projectCount, articleCount, inquiryCount, newInquiryCount] =
    await Promise.all([
      db.service.count(),
      db.project.count(),
      db.newsArticle.count(),
      db.inquiry.count(),
      db.inquiry.count({ where: { status: "NEW" } }),
    ]);

  const stats = [
    { label: "Services", value: serviceCount, href: "/admin/services", icon: Briefcase },
    { label: "Portfolio Projects", value: projectCount, href: "/admin/portfolio", icon: FolderKanban },
    { label: "News Articles", value: articleCount, href: "/admin/news", icon: Newspaper },
    { label: "Contact Inquiries", value: inquiryCount, href: "/admin/inquiries", icon: Inbox, badge: `${newInquiryCount} new` },
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-cyan-600" aria-hidden="true" />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="font-heading text-3xl font-bold text-navy-800">{stat.value}</span>
                {stat.badge && stat.badge !== "0 new" && (
                  <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">{stat.badge}</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy-800">Getting started</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            This dashboard gives you a quick overview of your content. Use the sidebar to
            manage each section of the website.
          </p>
          <Link
            href="/admin/portfolio"
            className="inline-flex items-center gap-1.5 font-semibold text-cyan-600 hover:text-cyan-700"
          >
            Manage portfolio projects
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
