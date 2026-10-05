"use client";

import { Smartphone, Wallet, Globe, Landmark, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Smartphone, Wallet, Globe };

/** Maps a registry icon name to a Lucide icon (fallback: Landmark). */
export function ProviderIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Landmark;
  return <Icon className={className} aria-hidden="true" />;
}
