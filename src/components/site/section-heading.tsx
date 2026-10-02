import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
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
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          {eyebrow}
        </span>
      )}
      <Tag className="font-heading text-3xl font-bold tracking-tight text-navy-800 sm:text-4xl">
        {title}
      </Tag>
      {description && (
        <p className="max-w-2xl text-base leading-relaxed text-slate-600">{description}</p>
      )}
    </div>
  );
}
