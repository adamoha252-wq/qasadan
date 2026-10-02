import {
  Code2, AppWindow, PenTool, Palette, TrendingUp, ShieldCheck, Globe, Smartphone,
  Search, Server, Zap, Users, Briefcase, Layers, Rocket, Wrench, BarChart3,
  type LucideIcon,
} from "lucide-react";

/**
 * Registry mapping service icon names (stored in DB) to Lucide components.
 * Unknown names fall back to a sensible default.
 */
const ICONS: Record<string, LucideIcon> = {
  Code2,
  AppWindow,
  PenTool,
  Palette,
  TrendingUp,
  ShieldCheck,
  Globe,
  Smartphone,
  Search,
  Server,
  Zap,
  Users,
  Briefcase,
  Layers,
  Rocket,
  Wrench,
  BarChart3,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Code2;
  return <Icon className={className} aria-hidden="true" />;
}
