import { Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  icon: Icon = Sparkles,
  id,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  icon?: LucideIcon;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <span className="ab-anim inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <Icon className="ab-icon-hover h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </span>
      )}
      <Tag id={id} className="font-heading text-3xl font-bold tracking-tight text-navy-800 sm:text-4xl">
        {title}
      </Tag>
      <span
        aria-hidden="true"
        className={cn("ab-title-line", align === "center" && "mx-auto")}
      />
      {description && (
        <p className="max-w-2xl text-base leading-relaxed text-slate-600">{description}</p>
      )}
    </div>
  );
}
