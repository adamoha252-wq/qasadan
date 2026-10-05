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
import { apiFetch, ApiError } from "@/lib/admin/api";
import { pricingPlanSchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput, TextArea, SwitchField } from "@/components/admin/form-kit";

type PlanRow = {
  id: string;
  name: string;
  tagline: string | null;
  price: string;
  period: string;
  features: string; // JSON-encoded string[]
  isFeatured: boolean;
  ctaLabel: string;
  order: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  tagline: "",
  price: "",
  period: "per project",
  featuresText: "",
  isFeatured: false,
  ctaLabel: "Choose Plan",
  order: 0,
  isActive: true,
};

function parseFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function AdminPricingPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ plans: PlanRow[] }>("/api/admin/pricing");
      setRows(data.plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pricing plans");
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

  const openEdit = (row: PlanRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      tagline: row.tagline || "",
      price: row.price,
      period: row.period,
      featuresText: parseFeatures(row.features).join("\n"),
      isFeatured: row.isFeatured,
      ctaLabel: row.ctaLabel,
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
      const features = form.featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 12);
      const parsed = pricingPlanSchema.safeParse({
        name: form.name,
        tagline: form.tagline,
        price: form.price,
        period: form.period,
        features,
        isFeatured: form.isFeatured,
        ctaLabel: form.ctaLabel,
        order: Number(form.order) || 0,
        isActive: form.isActive,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/pricing/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Pricing plan updated" });
      } else {
        await apiFetch("/api/admin/pricing", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Pricing plan added" });
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
      await apiFetch(`/api/admin/pricing/${id}`, { method: "DELETE" });
      toast({ title: "Pricing plan removed" });
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
        title="Pricing Plans"
        description="The pricing packages shown on the homepage. Tip: keep exactly one plan marked as Most Popular."
      >
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Plan
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading plans…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No pricing plans yet — add your first package." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Plan</th>
                  <th scope="col" className="px-4 py-3">Price</th>
                  <th scope="col" className="px-4 py-3">Features</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-navy-800">{row.name}</p>
                        {row.isFeatured && (
                          <Badge className="bg-gradient-to-r from-cyan-500 to-brand-600 text-white hover:bg-brand-600">
                            Most Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{row.tagline}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-base font-bold text-navy-800">{row.price}</p>
                      <p className="text-xs text-slate-400">/ {row.period}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {parseFeatures(row.features).length} items
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
                          title={`Remove the ${row.name} plan?`}
                          description="It will disappear from the homepage pricing section."
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
            <DialogTitle>{editing ? "Edit Pricing Plan" : "Add Pricing Plan"}</DialogTitle>
            <DialogDescription>Shown in the homepage pricing section.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plan name" htmlFor="pl-name" required>
                <TextInput id="pl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Professional" />
              </Field>
              <Field label="Price" htmlFor="pl-price" required hint='e.g. $299 or "Custom"'>
                <TextInput id="pl-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="$299" />
              </Field>
              <Field label="Period" htmlFor="pl-period" hint='e.g. "per project"'>
                <TextInput id="pl-period" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
              </Field>
              <Field label="Button label" htmlFor="pl-cta">
                <TextInput id="pl-cta" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              </Field>
            </div>
            <Field label="Tagline" htmlFor="pl-tagline" hint="Short description under the name (optional)">
              <TextInput id="pl-tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="For growing companies" />
            </Field>
            <Field
              label="Included features"
              htmlFor="pl-features"
              hint="One feature per line — shown as a checklist (max 12)"
              required
            >
              <TextArea
                id="pl-features"
                rows={6}
                value={form.featuresText}
                onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
                placeholder={"5-page responsive website\nBasic SEO setup\nContact form"}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <SwitchField
                id="pl-featured"
                label="Most Popular"
                description="Highlighted with a badge on the site."
                checked={form.isFeatured}
                onCheckedChange={(v) => setForm({ ...form, isFeatured: v })}
              />
              <SwitchField
                id="pl-active"
                label="Active"
                description="Inactive plans are hidden."
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
            <Field label="Display order" htmlFor="pl-order">
              <TextInput id="pl-order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Add plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
