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
import { partnerSchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput, SwitchField } from "@/components/admin/form-kit";
import { ImageUpload } from "@/components/admin/image-upload";

type PartnerRow = {
  id: string;
  name: string;
  category: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  order: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  category: "",
  logoUrl: "",
  websiteUrl: "",
  order: 0,
  isActive: true,
};

export default function AdminPartnersPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ partners: PartnerRow[] }>("/api/admin/partners");
      setRows(data.partners);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load partners");
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

  const openEdit = (row: PartnerRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category || "",
      logoUrl: row.logoUrl || "",
      websiteUrl: row.websiteUrl || "",
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
      const parsed = partnerSchema.safeParse({
        ...form,
        order: Number(form.order) || 0,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/partners/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Partner updated" });
      } else {
        await apiFetch("/api/admin/partners", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Partner added" });
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
      await apiFetch(`/api/admin/partners/${id}`, { method: "DELETE" });
      toast({ title: "Partner removed" });
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
        title="Partners & Clients"
        description="Organizations shown in the “Trusted by” section on the homepage."
      >
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Partner
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading partners…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No partners yet — add the organizations you've worked with." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Partner</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Website</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.logoUrl ? (
                          <img src={row.logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain" />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-sm font-bold text-navy-700"
                          >
                            {row.name.charAt(0)}
                          </span>
                        )}
                        <p className="font-medium text-navy-800">{row.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.category || "—"}</td>
                    <td className="px-4 py-3">
                      {row.websiteUrl ? (
                        <a
                          href={row.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 underline-offset-2 hover:underline"
                        >
                          Visit
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
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
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(row.id)}
                          title={`Remove ${row.name}?`}
                          description="They will disappear from the Trusted-by section."
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Partner" : "Add Partner"}</DialogTitle>
            <DialogDescription>
              Shown in the “Trusted by” section on the homepage.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization name" htmlFor="pt-name" required>
                <TextInput id="pt-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Foundation" />
              </Field>
              <Field label="Category" htmlFor="pt-cat" hint="e.g. NGO, Education, Government">
                <TextInput id="pt-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="NGO" />
              </Field>
            </div>
            <ImageUpload
              id="pt-logo"
              label="Logo"
              hint="Square logo works best (optional)"
              value={form.logoUrl}
              onChange={(url) => setForm({ ...form, logoUrl: url })}
            />
            <Field label="Website URL" htmlFor="pt-web" hint="Optional — shows a “Visit website” link">
              <TextInput id="pt-web" type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://example.org" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display order" htmlFor="pt-order">
                <TextInput id="pt-order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
              <div className="self-end pb-1">
                <SwitchField
                  id="pt-active"
                  label="Active"
                  description="Inactive partners are hidden."
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Add partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
