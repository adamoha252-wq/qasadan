"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { apiFetch } from "@/lib/admin/api";
import { Field, TextInput, TextArea, SelectField } from "@/components/admin/form-kit";
import { listProviderDefinitions } from "@/lib/payments/registry";
import { formatMoney, type InvoiceAdminView } from "@/lib/payments/invoice-types";

/**
 * Create / Edit invoice dialog (Phase 2).
 * The currency list is registry-driven: every currency any implemented
 * provider supports is selectable (WAAFI Pay: USD, SLSH, DJF today).
 */

export type InvoiceFormValues = {
  clientName: string;
  clientEmail: string;
  projectService: string;
  description: string;
  amount: string;
  currency: string;
  dueDate: string; // yyyy-mm-dd
};

const EMPTY_FORM: InvoiceFormValues = {
  clientName: "",
  clientEmail: "",
  projectService: "",
  description: "",
  amount: "",
  currency: "USD",
  dueDate: "",
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode; an invoice = edit mode (PENDING only, enforced server-side). */
  editing: InvoiceAdminView | null;
  /** Called with the saved invoice (create returns the fresh payment link). */
  onSaved: (invoice: InvoiceAdminView) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<InvoiceFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const def of listProviderDefinitions()) {
      if (!def.implemented) continue;
      for (const c of def.currencies) codes.add(c.code);
    }
    return [...codes].sort().map((code) => {
      const def = listProviderDefinitions().find((d) =>
        d.currencies.some((c) => c.code === code)
      );
      const label =
        def?.currencies.find((c) => c.code === code)?.label ?? code;
      return { value: code, label: `${code} — ${label}` };
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setFieldError(null);
    if (editing) {
      setForm({
        clientName: editing.clientName,
        clientEmail: editing.clientEmail ?? "",
        projectService: editing.projectService,
        description: editing.description ?? "",
        amount: editing.amount,
        currency: editing.currency,
        dueDate: toDateInput(editing.dueDate),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  const set = <K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.clientName.trim()) return "Client name is required.";
    if (form.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail.trim()))
      return "Enter a valid client email.";
    if (!form.projectService.trim()) return "Project / service is required.";
    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount <= 0)
      return "Amount must be greater than zero.";
    if (Math.round(amount * 100) / 100 !== amount)
      return "Amount supports at most 2 decimal places.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setFieldError(problem);
      return;
    }
    setSubmitting(true);
    setFieldError(null);
    try {
      const payload = {
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        projectService: form.projectService.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        dueDate: form.dueDate || "",
      };
      const result = editing
        ? await apiFetch<{ invoice: InvoiceAdminView }>(`/api/admin/invoices/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiFetch<{ invoice: InvoiceAdminView }>("/api/admin/invoices", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      toast({
        title: editing ? "Invoice updated" : "Invoice created",
        description: `${result.invoice.invoiceNumber} — ${formatMoney(
          result.invoice.amount,
          result.invoice.currency
        )}`,
      });
      onSaved(result.invoice);
      onOpenChange(false);
    } catch (e) {
      setFieldError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.invoiceNumber}` : "New Invoice"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the invoice details. The existing payment link stays the same."
              : "Create an invoice and QASADAN generates a secure payment link you can share with your client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" htmlFor="inv-client" required>
              <TextInput
                id="inv-client"
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                placeholder="e.g. Al-Huda School"
                maxLength={120}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Client email"
              htmlFor="inv-email"
              hint="Optional — kept private, never shown on the payment page"
            >
              <TextInput
                id="inv-email"
                type="email"
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                placeholder="client@example.com"
                maxLength={160}
                autoComplete="off"
              />
            </Field>
          </div>

          <Field label="Project / service" htmlFor="inv-project" required>
            <TextInput
              id="inv-project"
              value={form.projectService}
              onChange={(e) => set("projectService", e.target.value)}
              placeholder="e.g. School website redesign — phase 1"
              maxLength={160}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount" htmlFor="inv-amount" required>
              <TextInput
                id="inv-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="299.00"
              />
            </Field>
            <Field label="Currency" htmlFor="inv-currency" required>
              <SelectField
                id="inv-currency"
                value={form.currency}
                onValueChange={(v) => set("currency", v)}
                options={currencyOptions}
                placeholder="Currency"
              />
            </Field>
            <Field label="Due date" htmlFor="inv-due" hint="Optional payment deadline">
              <TextInput
                id="inv-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="inv-desc" hint="Optional details shown to the client">
            <TextArea
              id="inv-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this invoice covers, payment terms, reference numbers…"
              rows={3}
              maxLength={2000}
            />
          </Field>

          {fieldError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {fieldError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing ? "Save changes" : "Create invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
