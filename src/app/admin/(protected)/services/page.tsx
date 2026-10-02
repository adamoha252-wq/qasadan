"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ServiceIcon } from "@/components/site/icon";
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
import { serviceSchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput, TextArea, SwitchField, SelectField } from "@/components/admin/form-kit";

type ServiceRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  features: string;
  imageUrl: string | null;
  order: number;
  isActive: boolean;
};

const ICON_OPTIONS = [
  "Code2", "AppWindow", "PenTool", "Palette", "TrendingUp", "ShieldCheck",
  "Globe", "Smartphone", "Search", "Server", "Zap", "Users", "Briefcase",
  "Layers", "Rocket", "Wrench", "BarChart3",
].map((n) => ({ value: n, label: n }));

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  icon: "Code2",
  features: "",
  imageUrl: "",
  order: 0,
  isActive: true,
};

export default function AdminServicesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ services: ServiceRow[] }>("/api/admin/services");
      setRows(data.services);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ServiceRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      features: JSON.parse(row.features || "[]").join("\n"),
      imageUrl: row.imageUrl || "",
      order: row.order,
      isActive: row.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description,
        icon: form.icon,
        features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
        imageUrl: form.imageUrl,
        order: Number(form.order) || 0,
        isActive: form.isActive,
      };
      const parsed = serviceSchema.safeParse(payload);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the form fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/services/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Service updated" });
      } else {
        await apiFetch("/api/admin/services", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Service created" });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/services/${id}`, { method: "DELETE" });
      toast({ title: "Service deleted" });
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
      <PageHeader title="Services" description="Manage the services showcased on the public website.">
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Service
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading services…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No services yet. Add your first service to get started." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Service</th>
                  <th scope="col" className="px-4 py-3">Slug</th>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                          <ServiceIcon name={row.icon} className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-navy-800">{row.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.slug}</td>
                    <td className="px-4 py-3 text-slate-500">{row.order}</td>
                    <td className="px-4 py-3">
                      <PublishBadge published={row.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50"
                          aria-label={`Edit ${row.title}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(row.id)}
                          title={`Delete "${row.title}"?`}
                          description="This service will be removed from the public website."
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              Services appear on the homepage and services page.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="svc-title" required>
                <TextInput
                  id="svc-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Web Development"
                />
              </Field>
              <Field label="Slug" htmlFor="svc-slug" hint="Lowercase with hyphens" required>
                <TextInput
                  id="svc-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={slugify(form.title) || "web-development"}
                />
              </Field>
            </div>
            <Field label="Description" htmlFor="svc-desc" required>
              <TextArea
                id="svc-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this service include and who is it for?"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Icon" htmlFor="svc-icon" hint="Lucide icon shown on the card">
                <SelectField
                  id="svc-icon"
                  value={form.icon}
                  onValueChange={(v) => setForm({ ...form, icon: v })}
                  options={ICON_OPTIONS}
                />
              </Field>
              <Field label="Display order" htmlFor="svc-order" hint="Lower numbers appear first">
                <TextInput
                  id="svc-order"
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Features" htmlFor="svc-features" hint="One per line (max 12)">
              <TextArea
                id="svc-features"
                rows={4}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder={"Corporate websites\nE-commerce\nLanding pages"}
              />
            </Field>
            <SwitchField
              id="svc-active"
              label="Active"
              description="Inactive services are hidden from the public website."
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Create service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
