"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { apiFetch, ApiError } from "@/lib/admin/api";
import { siteStatSchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput, SwitchField } from "@/components/admin/form-kit";

type StatRow = {
  id: string;
  value: string;
  label: string;
  order: number;
  isActive: boolean;
};

const emptyForm = { value: "", label: "", order: 0, isActive: true };

export default function AdminSiteStatsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StatRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ stats: StatRow[] }>("/api/admin/site-stats");
      setRows(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
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

  const openEdit = (row: StatRow) => {
    setEditing(row);
    setForm({ value: row.value, label: row.label, order: row.order, isActive: row.isActive });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const parsed = siteStatSchema.safeParse({
        ...form,
        order: Number(form.order) || 0,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/site-stats/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Stat updated" });
      } else {
        await apiFetch("/api/admin/site-stats", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Stat added" });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/site-stats/${id}`, { method: "DELETE" });
      toast({ title: "Stat removed" });
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
      <PageHeader
        title="Hero Stats"
        description="The animated numbers shown in the homepage hero band (e.g. 50+ Projects Delivered)."
      >
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Stat
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading stats…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No stats yet — add your first one (e.g. 50+ Projects Delivered)." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Value</th>
                  <th scope="col" className="px-4 py-3">Label</th>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-heading text-lg font-bold text-navy-800">
                      {row.value}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.label}</td>
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
                          aria-label={`Edit ${row.label}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(row.id)}
                          title={`Remove "${row.value} ${row.label}"?`}
                          description="It will disappear from the homepage hero."
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Stat" : "Add Stat"}</DialogTitle>
            <DialogDescription>
              Shown in the animated stats band on the homepage hero.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Value" htmlFor="st-value" required hint="e.g. 50+ or 24/7">
                <TextInput id="st-value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="50+" />
              </Field>
              <Field label="Display order" htmlFor="st-order">
                <TextInput id="st-order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Label" htmlFor="st-label" required hint="e.g. Projects Delivered">
              <TextInput id="st-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Projects Delivered" />
            </Field>
            <SwitchField
              id="st-active"
              label="Active"
              description="Inactive stats are hidden from the hero band."
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Add stat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
