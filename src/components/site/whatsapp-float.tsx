"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { siteConfig } from "@/lib/site";

/**
 * Floating WhatsApp action button — appears after a short scroll,
 * with a soft glow pulse and an expandable chat-bubble label.
 */
export function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-open the label bubble once, briefly, to attract attention
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setExpanded(true), 800);
    const t2 = setTimeout(() => setExpanded(false), 5200);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [visible]);

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Hide chat label" : "Show chat label"}
        className={`flex max-w-[240px] items-center overflow-hidden rounded-full bg-white text-sm font-medium text-navy-800 shadow-lg ring-1 ring-slate-200 transition-all duration-300 ${
          expanded ? "w-auto px-4 py-2.5 opacity-100" : "w-0 px-0 py-0 opacity-0"
        }`}
      >
        {expanded && (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <X className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Chat with us on WhatsApp
          </span>
        )}
      </button>
      <a
        href={siteConfig.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with QASADAN on WhatsApp"
        className="animate-glow-pulse flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform duration-300 hover:scale-110"
      >
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>
    </div>
  );
}
