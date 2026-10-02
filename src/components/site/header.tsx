"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        {/* Brand */}
        <Link
          href="/"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500"
          aria-label="QASADAN — Home"
        >
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {siteConfig.mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500",
                isActive(item.href)
                  ? "text-cyan-600"
                  : "text-navy-700 hover:text-cyan-600"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:block">
          <Button asChild className="bg-navy-800 text-white hover:bg-navy-700">
            <a href="/contact" className="inline-flex items-center gap-2">
              Start a Project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden border-navy-200 text-navy-800"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-full max-w-xs flex-col gap-0 p-0">
            <SheetHeader className="border-b border-slate-200 p-4">
              <SheetTitle className="text-left">
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <nav
              aria-label="Mobile navigation"
              className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
            >
              {siteConfig.mainNav.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg px-4 text-base font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-cyan-50 text-cyan-700"
                        : "text-navy-800 hover:bg-slate-100"
                    )}
                  >
                    {item.title}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <Button asChild className="w-full bg-navy-800 text-white hover:bg-navy-700">
                <SheetClose asChild>
                  <a href="/contact" className="inline-flex items-center justify-center gap-2">
                    Start a Project
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </SheetClose>
              </Button>
              <p className="mt-3 text-center text-xs text-slate-500">
                {siteConfig.email}
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
