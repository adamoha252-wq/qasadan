"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Star } from "lucide-react";
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
import { testimonialSchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput, TextArea, SwitchField, SelectField } from "@/components/admin/form-kit";
import { ImageUpload } from "@/components/admin/image-upload";

type TestimonialRow = {
  id: string;
  clientName: string;
  clientRole: string | null;
  company: string | null;
  quote: string;
  rating: number;
  isPublished: boolean;
};

const emptyForm = {
  clientName: "",
  clientRole: "",
  company: "",
  quote: "",
  rating: 5,
  imageUrl: "",
  isPublished: true,
};

export default function AdminTestimonialsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ testimonials: TestimonialRow[] }>("/api/admin/testimonials");
      setRows(data.testimonials);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load testimonials");
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

  const openEdit = (row: TestimonialRow) => {
    setEditing(row);
    setForm({
      clientName: row.clientName,
      clientRole: row.clientRole || "",
      company: row.company || "",
      quote: row.quote,
      rating: row.rating,
      imageUrl: "",
      isPublished: row.isPublished,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const parsed = testimonialSchema.safeParse({ ...form, rating: Number(form.rating) });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/testimonials/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Testimonial updated" });
      } else {
        await apiFetch("/api/admin/testimonials", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Testimonial added" });
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
      await apiFetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      toast({ title: "Testimonial deleted" });
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
      <PageHeader title="Testimonials" description="Client quotes shown on the homepage and about page.">
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Testimonial
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading testimonials…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No testimonials yet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-navy-800">{row.clientName}</p>
                  <p className="text-xs text-slate-500">
                    {[row.clientRole, row.company].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-0.5" aria-label={`Rated ${row.rating} of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 ${i < row.rating ? "fill-cyan-500 text-cyan-500" : "text-slate-200"}`}
                    />
                  ))}
                </div>
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-slate-600">
                “{row.quote}”
              </blockquote>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <PublishBadge published={row.isPublished} />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(row)}
                    className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50"
                    aria-label={`Edit testimonial from ${row.clientName}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <DeleteButton
                    onConfirm={() => handleDelete(row.id)}
                    title={`Delete testimonial from ${row.clientName}?`}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>Shown on the homepage and about page.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client name" htmlFor="ts-name" required>
                <TextInput id="ts-name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              </Field>
              <Field label="Role" htmlFor="ts-role" hint="Optional">
                <TextInput id="ts-role" value={form.clientRole} onChange={(e) => setForm({ ...form, clientRole: e.target.value })} placeholder="Executive Director" />
              </Field>
              <Field label="Company" htmlFor="ts-company" hint="Optional">
                <TextInput id="ts-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </Field>
              <Field label="Rating" htmlFor="ts-rating">
                <SelectField
                  id="ts-rating"
                  value={String(form.rating)}
                  onValueChange={(v) => setForm({ ...form, rating: Number(v) })}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? "s" : ""}` }))}
                />
              </Field>
            </div>
            <Field label="Quote" htmlFor="ts-quote" required>
              <TextArea id="ts-quote" rows={4} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
            </Field>
            <ImageUpload
              id="ts-image"
              label="Client photo (optional)"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
            <SwitchField
              id="ts-published"
              label="Published"
              description="Visible on the public website."
              checked={form.isPublished}
              onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Add testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
