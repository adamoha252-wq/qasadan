"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";

type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  category: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  order: number;
  updatedAt: string;
};

export default function AdminPortfolioPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ projects: ProjectRow[] }>("/api/admin/projects");
      setRows(data.projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFlag = async (row: ProjectRow, field: "isPublished" | "isFeatured") => {
    // Optimistic update
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, [field]: !r[field] } : r)));
    try {
      // Fetch full project, flip the flag, and save (keeps API simple)
      const { project } = await apiFetch<{ project: Record<string, unknown> }>(
        `/api/admin/projects/${row.id}`
      );
      await apiFetch(`/api/admin/projects/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...project, [field]: !row[field] }),
      });
      toast({
        title: field === "isPublished" ? (!row.isPublished ? "Project published" : "Project unpublished") : (!row.isFeatured ? "Added to featured" : "Removed from featured"),
      });
    } catch (e) {
      await load();
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      toast({ title: "Project deleted" });
      await load();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Portfolio" description="Case studies shown on the public portfolio page.">
        <Button asChild className="bg-navy-800 text-white hover:bg-navy-700">
          <Link href="/admin/portfolio/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Project
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading projects…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No projects yet. Create your first portfolio project." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Project</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Featured</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-800">{row.title}</p>
                      <p className="font-mono text-xs text-slate-400">{row.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.category ? (
                        <Badge variant="secondary" className="bg-cyan-50 text-cyan-800">
                          {row.category}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PublishBadge published={row.isPublished} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFlag(row, "isFeatured")}
                        aria-pressed={row.isFeatured}
                        aria-label={row.isFeatured ? `Unfeature ${row.title}` : `Feature ${row.title}`}
                        className={`h-8 gap-1.5 px-2 ${row.isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-100"}`}
                      >
                        <Star className={`h-4 w-4 ${row.isFeatured ? "fill-amber-400" : ""}`} aria-hidden="true" />
                        {row.isFeatured ? "Featured" : "Feature"}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFlag(row, "isPublished")}
                          className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50"
                        >
                          {row.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50">
                          <Link href={`/admin/portfolio/${row.id}`} aria-label={`Edit ${row.title}`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Edit</span>
                          </Link>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(row.id)}
                          title={`Delete "${row.title}"?`}
                          description="The project and its gallery images will be permanently removed."
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
