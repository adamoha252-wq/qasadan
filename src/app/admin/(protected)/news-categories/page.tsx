"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, slugify, ApiError } from "@/lib/admin/api";
import { categorySchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput } from "@/components/admin/form-kit";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  _count: { articles: number };
};

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ categories: CategoryRow[] }>("/api/admin/categories");
      setRows(data.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "" });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setForm({ name: row.name, slug: row.slug });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = { name: form.name, slug: form.slug || slugify(form.name) };
      const parsed = categorySchema.safeParse(payload);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Category updated" });
      } else {
        await apiFetch("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Category created" });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      toast({ title: "Category deleted" });
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
      <PageHeader title="News Categories" description="Categories used to organize news articles.">
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Category
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading categories…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No categories yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Slug</th>
                <th scope="col" className="px-4 py-3">Articles</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-800">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                      {row._count.articles}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                        className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50"
                        aria-label={`Edit ${row.name}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <DeleteButton
                        onConfirm={() => handleDelete(row.id)}
                        title={`Delete "${row.name}"?`}
                        description={
                          row._count.articles > 0
                            ? "Cannot delete — articles still use this category."
                            : "This cannot be undone."
                        }
                        disabled={row._count.articles > 0}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Used to group news articles.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <Field label="Name" htmlFor="cat-name" required>
              <TextInput
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Agency Updates"
              />
            </Field>
            <Field label="Slug" htmlFor="cat-slug" hint="Lowercase with hyphens" required>
              <TextInput
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder={slugify(form.name) || "agency-updates"}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
