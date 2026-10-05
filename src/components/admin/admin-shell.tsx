"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  FolderKanban,
  Newspaper,
  Tags,
  Users,
  MessageSquareQuote,
  Inbox,
  ReceiptText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  ExternalLink,
  TrendingUp,
  BadgeDollarSign,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";

export const adminNav = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Services", href: "/admin/services", icon: Briefcase },
  { title: "Portfolio", href: "/admin/portfolio", icon: FolderKanban },
  { title: "News", href: "/admin/news", icon: Newspaper },
  { title: "Categories", href: "/admin/news-categories", icon: Tags },
  { title: "Team", href: "/admin/team", icon: Users },
  { title: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { title: "Hero Stats", href: "/admin/site-stats", icon: TrendingUp },
  { title: "Pricing Plans", href: "/admin/pricing", icon: BadgeDollarSign },
  { title: "Partners", href: "/admin/partners", icon: Handshake },
  { title: "Inquiries", href: "/admin/inquiries", icon: Inbox },
  { title: "Invoices", href: "/admin/invoices", icon: ReceiptText },
  { title: "Payments", href: "/admin/payments", icon: CreditCard },
  { title: "Settings", href: "/admin/settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {adminNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
            isActive(pathname, item.href)
              ? "bg-cyan-500 font-semibold text-navy-900"
              : "text-navy-100 hover:bg-navy-700 hover:text-white"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}

function UserFooter({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="border-t border-navy-700 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-navy-900"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-navy-300">{user.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-1 w-full justify-start gap-3 text-navy-200 hover:bg-navy-700 hover:text-white"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Sign Out"}
      </Button>
    </div>
  );
}

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-800 lg:flex">
        <div className="border-b border-navy-700 p-4">
          <Logo light />
        </div>
        <NavLinks />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-3 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-navy-300 transition-colors hover:bg-navy-700 hover:text-cyan-400"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          View public website
        </a>
        <UserFooter user={user} />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <Logo />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-navy-200 text-navy-800"
                aria-label="Open admin menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-0 bg-navy-800 p-0">
              <SheetHeader className="border-b border-navy-700 p-4 text-left">
                <SheetTitle>
                  <Logo light />
                </SheetTitle>
              </SheetHeader>
              <NavLinks onNavigate={() => setOpen(false)} />
              <UserFooter user={user} />
            </SheetContent>
          </Sheet>
        </header>

        <main id="admin-main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
