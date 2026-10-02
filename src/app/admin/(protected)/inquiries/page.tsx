"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import {
  PageHeader,
  InquiryStatusBadge,
  DeleteButton,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
};

const STATUS_OPTIONS = ["NEW", "READ", "RESPONDED", "ARCHIVED"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminInquiriesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter === "ALL" ? "/api/admin/inquiries" : `/api/admin/inquiries?status=${filter}`;
      const data = await apiFetch<{ inquiries: InquiryRow[] }>(url);
      setRows(data.inquiries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    // Optimistic
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await apiFetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      await load();
      toast({
        title: "Status update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      toast({ title: "Inquiry deleted" });
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
      <PageHeader title="Contact Inquiries" description="Messages submitted through the public contact form.">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading inquiries…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No inquiries match this filter." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-navy-800">
                    {row.name}
                    {row.subject && (
                      <span className="ml-2 text-sm font-normal text-slate-500">— {row.subject}</span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 hover:text-cyan-700">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {row.email}
                    </a>
                    {row.phone && (
                      <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 hover:text-cyan-700">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {row.phone}
                      </a>
                    )}
                    <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time>
                  </div>
                </div>
                <InquiryStatusBadge status={row.status} />
              </div>
              <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {row.message}
              </p>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <label htmlFor={`status-${row.id}`} className="text-xs text-slate-500">
                    Status
                  </label>
                  <Select value={row.status} onValueChange={(v) => changeStatus(row.id, v)}>
                    <SelectTrigger id={`status-${row.id}`} className="h-8 w-36 text-xs" aria-label={`Change status for ${row.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DeleteButton
                  onConfirm={() => handleDelete(row.id)}
                  title={`Delete inquiry from ${row.name}?`}
                  description="The message will be permanently removed."
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
