"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { listProviderDefinitions } from "@/lib/payments/registry";
import {
  formatInvoiceDate,
  formatMoney,
  invoiceStatusLabel,
} from "@/lib/payments/invoice-types";
import {
  PAYMENT_ATTEMPT_STATUSES,
  paymentStatusBadgeClass,
  paymentStatusLabel,
  type PaymentAdminView,
} from "@/lib/payments/payment-types";

/**
 * Admin Dashboard → Payments (Phase 5, spec §8).
 * The payment history: every hosted-checkout attempt with invoice, client,
 * provider, method, amount, transaction ids, status and date — searchable
 * and filterable. Row details include the verification trail (transaction
 * id, payer account, failure reason, verified date).
 */

const providerOptions = listProviderDefinitions()
  .filter((d) => d.implemented)
  .map((d) => ({ value: d.code, label: d.name }));

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-sm text-navy-900 sm:text-right">
        {children}
      </dd>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PaymentAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");

  const [detail, setDetail] = useState<PaymentAdminView | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

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
      if (providerFilter !== "ALL") params.set("provider", providerFilter);
      const data = await apiFetch<{ payments: PaymentAdminView[] }>(
        `/api/admin/payments?${params.toString()}`
      );
      setRows(data.payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, providerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      succeeded: rows.filter((r) => r.status === "SUCCEEDED").length,
      failed: rows.filter((r) => r.status === "FAILED" || r.status === "CALLBACK_FAILURE").length,
      inProgress: rows.filter(
        (r) =>
          r.status === "INITIATING" ||
          r.status === "INITIATED" ||
          r.status === "CALLBACK_SUCCESS"
      ).length,
    };
  }, [rows]);

  const downloadReceipt = async (payment: PaymentAdminView) => {
    if (!payment.receiptUrl) return;
    setReceiptBusy(true);
    try {
      const response = await fetch(payment.receiptUrl);
      if (!response.ok) {
        throw new Error("Receipt not available yet.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QASADAN-Receipt-${payment.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        title: "Receipt unavailable",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Every payment attempt with provider, method, transaction IDs and verification status."
      />

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Attempts", value: stats.total, cls: "text-navy-800" },
          { label: "Succeeded", value: stats.succeeded, cls: "text-emerald-600" },
          { label: "In progress", value: stats.inProgress, cls: "text-sky-600" },
          { label: "Failed", value: stats.failed, cls: "text-red-600" },
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
            placeholder="Search invoice, client, reference, txn…"
            aria-label="Search payments"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {PAYMENT_ATTEMPT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {paymentStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All providers</SelectItem>
            {providerOptions.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh payments">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading payments…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No payment attempts yet — they appear here as soon as a client starts paying an invoice." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference / Txn ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-800">{payment.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">
                      {invoiceStatusLabel(payment.invoiceStatus)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-40 truncate font-medium text-navy-800">
                      {payment.clientName}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span className="whitespace-nowrap text-sm text-slate-700">
                        {payment.providerName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {payment.methodLabel}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold text-navy-800">
                    {formatMoney(payment.amount, payment.currency)}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-44 truncate font-mono text-xs text-slate-600">
                      {payment.referenceId}
                    </p>
                    {payment.providerTxnId && (
                      <p className="max-w-44 truncate font-mono text-xs text-slate-400">
                        {payment.providerTxnId}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`whitespace-nowrap ${paymentStatusBadgeClass(payment.status)}`}
                    >
                      {paymentStatusLabel(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {formatInvoiceDate(payment.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetail(payment)}
                        aria-label={`View details for ${payment.referenceId}`}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`More actions for ${payment.referenceId}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {payment.receiptUrl && (
                            <DropdownMenuItem
                              onSelect={() => downloadReceipt(payment)}
                              disabled={receiptBusy}
                            >
                              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                              Download receipt
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <a
                              href={payment.paymentPageUrl ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                              Open payment page
                            </a>
                          </DropdownMenuItem>
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

      {/* Details dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Payment attempt
            </DialogTitle>
            <DialogDescription>
              {detail && `${detail.invoiceNumber} — ${detail.clientName}`}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="mt-1">
              <dl>
                <DetailRow label="Status">
                  <Badge variant="outline" className={paymentStatusBadgeClass(detail.status)}>
                    {paymentStatusLabel(detail.status)}
                  </Badge>
                </DetailRow>
                <DetailRow label="Provider">
                  {detail.providerName} ({detail.providerCode})
                </DetailRow>
                <DetailRow label="Method">{detail.methodLabel}</DetailRow>
                <DetailRow label="Amount">
                  {formatMoney(detail.amount, detail.currency)}
                </DetailRow>
                <DetailRow label="Reference ID">
                  <span className="font-mono text-xs">{detail.referenceId}</span>
                </DetailRow>
                <DetailRow label="Order ID">
                  <span className="font-mono text-xs">{detail.orderId ?? "—"}</span>
                </DetailRow>
                <DetailRow label="Transaction ID">
                  <span className="font-mono text-xs">{detail.providerTxnId ?? "—"}</span>
                </DetailRow>
                <DetailRow label="Payer account">
                  <span className="font-mono text-xs">{detail.payerAccount ?? "—"}</span>
                </DetailRow>
                <DetailRow label="Created">{formatInvoiceDate(detail.createdAt)}</DetailRow>
                <DetailRow label="Verified">
                  {detail.verifiedAt ? formatInvoiceDate(detail.verifiedAt) : "—"}
                </DetailRow>
                <DetailRow label="Provider callback">
                  {detail.hasCallbackData ? "Recorded" : "None"}
                </DetailRow>
                {detail.failureReason && (
                  <DetailRow label="Failure reason">
                    <span className="text-red-700">{detail.failureReason}</span>
                  </DetailRow>
                )}
              </dl>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {detail.receiptUrl && (
                  <Button onClick={() => downloadReceipt(detail)} disabled={receiptBusy} className="flex-1">
                    {receiptBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Download receipt
                  </Button>
                )}
                <Button variant="outline" asChild className="flex-1">
                  <a href={detail.paymentPageUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    Open payment page
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
