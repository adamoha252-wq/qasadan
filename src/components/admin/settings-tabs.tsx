"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tab navigation for the Settings area.
 * Routes are real pages (shareable, refresh-safe), styled as tabs.
 */

const TABS = [
  { href: "/admin/settings", label: "General", icon: Settings, exact: true },
  {
    href: "/admin/settings/payment-providers",
    label: "Payment Providers",
    icon: CreditCard,
    exact: false,
  },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div
      role="tablist"
      aria-label="Settings sections"
      className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
    >
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
              active
                ? "bg-white text-navy-800 shadow-sm"
                : "text-slate-500 hover:text-navy-800"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
