"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlock,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { InvoiceFormDialog } from "@/components/admin/payments/invoice-form-dialog";
import { ShareInvoiceLinkDialog } from "@/components/admin/payments/share-link-dialog";
import {
  INVOICE_STATUSES,
  formatInvoiceDate,
  formatMoney,
  invoiceActionPolicy,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  type InvoiceAdminView,
} from "@/lib/payments/invoice-types";

/**
 * Admin Dashboard → Invoices (Phase 2).
 * Create invoices, copy secure /pay/<token> links, track statuses.
 * Payment history with provider/transaction columns arrives in a later phase.
 */

function StatusCell({ invoice }: { invoice: InvoiceAdminView }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className={`whitespace-nowrap ${invoiceStatusBadgeClass(invoice.status)}`}
      >
        {invoiceStatusLabel(invoice.status)}
      </Badge>
      {invoice.overdue && (
        <Badge variant="outline" className="whitespace-nowrap border-red-200 bg-red-50 text-red-700">
          Overdue
        </Badge>
      )}
    </div>
  );
}

export default function AdminInvoicesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<InvoiceAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceAdminView | null>(null);
  const [shareTarget, setShareTarget] = useState<InvoiceAdminView | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvoiceAdminView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceAdminView | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<InvoiceAdminView | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce the search box (300ms)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const data = await apiFetch<{ invoices: InvoiceAdminView[] }>(
        `/api/admin/invoices?${params.toString()}`
      );
      setRows(data.invoices);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "PENDING");
    return {
      total: rows.length,
      pending: pending.length,
      paid: rows.filter((r) => r.status === "PAID").length,
      overdue: pending.filter((r) => r.overdue).length,
    };
  }, [rows]);

  const paymentLink = (invoice: InvoiceAdminView) =>
    `${window.location.origin}/pay/${invoice.token}`;

  const copyLink = async (invoice: InvoiceAdminView) => {
    try {
      await navigator.clipboard.writeText(paymentLink(invoice));
      setCopiedId(invoice.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Payment link copied" });
    } catch {
      setShareTarget(invoice);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setBusyAction(true);
    try {
      await apiFetch(`/api/admin/invoices/${cancelTarget.id}/cancel`, { method: "POST" });
      toast({ title: "Invoice cancelled", description: cancelTarget.invoiceNumber });
      setCancelTarget(null);
      await load();
    } catch (e) {
      toast({
        title: "Cancel failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyAction(true);
    try {
      await apiFetch(`/api/admin/invoices/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Invoice deleted", description: deleteTarget.invoiceNumber });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseTarget) return;
    setBusyAction(true);
    try {
      await apiFetch(`/api/admin/invoices/${releaseTarget.id}/release`, { method: "POST" });
      toast({
        title: "Invoice released",
        description: `${releaseTarget.invoiceNumber} is pending again — the client can retry.`,
      });
      setReleaseTarget(null);
      await load();
    } catch (e) {
      toast({
        title: "Release failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Create invoices and share secure payment links with your clients."
      >
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New Invoice
        </Button>
      </PageHeader>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, cls: "text-navy-800" },
          { label: "Pending", value: stats.pending, cls: "text-amber-600" },
          { label: "Paid", value: stats.paid, cls: "text-emerald-600" },
          { label: "Overdue", value: stats.overdue, cls: "text-red-600" },
        ].map((chip) => (
          <div
            key={chip.label}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {chip.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${chip.cls}`}>{chip.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, client, project…"
            aria-label="Search invoices"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {invoiceStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh invoices">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading invoices…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No invoices yet — create your first invoice to generate a secure payment link." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project / Service</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-800">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">
                      {formatInvoiceDate(invoice.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-44 truncate font-medium text-navy-800">
                      {invoice.clientName}
                    </p>
                    {invoice.clientEmail && (
                      <p className="max-w-44 truncate text-xs text-slate-400">
                        {invoice.clientEmail}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56">
                    <p className="truncate text-sm text-slate-600">{invoice.projectService}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold text-navy-800">
                    {formatMoney(invoice.amount, invoice.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {formatInvoiceDate(invoice.dueDate)}
                    {invoice.overdue && (
                      <span className="ml-1.5 text-xs font-medium text-red-600">overdue</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusCell invoice={invoice} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(invoice)}
                        aria-label={`Copy payment link for ${invoice.invoiceNumber}`}
                        title="Copy payment link"
                        className="h-8 w-8"
                      >
                        {copiedId === invoice.id ? (
                          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Link2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`More actions for ${invoice.invoiceNumber}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setShareTarget(invoice)}>
                            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                            Show payment link
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={paymentLink(invoice)} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                              Open payment page
                            </a>
                          </DropdownMenuItem>
                          {invoiceActionPolicy.canEdit(invoice.status) && (
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditing(invoice);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {invoiceActionPolicy.canCancel(invoice.status) && (
                            <DropdownMenuItem onSelect={() => setCancelTarget(invoice)}>
                              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                              Cancel invoice
                            </DropdownMenuItem>
                          )}
                          {invoiceActionPolicy.canRelease(invoice.status) && (
                            <DropdownMenuItem onSelect={() => setReleaseTarget(invoice)}>
                              <Unlock className="mr-2 h-4 w-4" aria-hidden="true" />
                              Release (stuck processing)
                            </DropdownMenuItem>
                          )}
                          {invoiceActionPolicy.canDelete(invoice.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setDeleteTarget(invoice)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={(invoice) => {
          load();
          if (!editing) setShareTarget(invoice); // fresh link → share immediately
        }}
      />

      <ShareInvoiceLinkDialog invoice={shareTarget} onOpenChange={() => setShareTarget(null)} />

      {/* Cancel confirm */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget &&
                `${cancelTarget.invoiceNumber} — ${formatMoney(
                  cancelTarget.amount,
                  cancelTarget.currency
                )} for ${cancelTarget.clientName}. The payment link stops accepting payment and the invoice is marked as Cancelled. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // keep dialog open while busy
                handleCancel();
              }}
              disabled={busyAction}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busyAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Cancel invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Release stuck-processing confirm */}
      <AlertDialog
        open={!!releaseTarget}
        onOpenChange={(open) => !open && setReleaseTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {releaseTarget &&
                `${releaseTarget.invoiceNumber} is stuck in Processing. Releasing marks its open payment session as failed and sets the invoice back to Pending so the client can pay again. Only do this when you are sure no payment is about to complete — a verified payment can never be released.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Keep processing</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRelease();
              }}
              disabled={busyAction}
            >
              {busyAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Release invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `${deleteTarget.invoiceNumber} — ${formatMoney(
                  deleteTarget.amount,
                  deleteTarget.currency
                )} for ${deleteTarget.clientName} will be permanently removed, together with its payment link. Paid or processing invoices cannot be deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={busyAction}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busyAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Delete invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
