"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  ArchivedBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  isArchived: boolean;
  publishedAt: string | null;
  category: { name: string } | null;
};

export default function AdminNewsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ articles: ArticleRow[] }>("/api/admin/articles");
      setRows(data.articles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePublish = async (row: ArticleRow) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, isPublished: !r.isPublished } : r)));
    try {
      const res = await fetch(`/api/admin/articles/${row.id}`);
      const { article } = await res.json();
      await apiFetch(`/api/admin/articles/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...article, isPublished: !row.isPublished }),
      });
      toast({ title: !row.isPublished ? "Article published" : "Article unpublished" });
      await load();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      toast({ title: "Article deleted" });
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
      <PageHeader title="News" description="Articles published on the public news page.">
        <Button asChild className="bg-navy-800 text-white hover:bg-navy-700">
          <Link href="/admin/news/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Article
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading articles…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No articles yet. Write your first one." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Article</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Status</th>
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
                          {row.category.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PublishBadge published={row.isPublished} />
                        {row.isArchived && <ArchivedBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublish(row)}
                          className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50"
                        >
                          {row.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50">
                          <Link href={`/admin/news/${row.id}`} aria-label={`Edit ${row.title}`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Edit</span>
                          </Link>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(row.id)}
                          title={`Delete "${row.title}"?`}
                          description="This article will be permanently removed."
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
