import { FolderSearch, Newspaper, Briefcase } from "lucide-react";

export function EmptyState({
  title,
  description,
  variant = "project",
}: {
  title: string;
  description: string;
  variant?: "project" | "article" | "service";
}) {
  const Icon = variant === "article" ? Newspaper : variant === "service" ? Briefcase : FolderSearch;
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-heading text-lg font-semibold text-navy-800">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
