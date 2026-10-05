"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, type InvoiceAdminView } from "@/lib/payments/invoice-types";

/**
 * Share payment link dialog — opens automatically after an invoice is
 * created so the admin can immediately copy the secure /pay/<token> URL.
 * The link is rebuilt from window.location.origin so it always carries the
 * correct host (preview panel, custom domain or production).
 */
export function ShareInvoiceLinkDialog({
  invoice,
  onOpenChange,
}: {
  invoice: InvoiceAdminView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  // React-recommended "reset state on prop change" pattern (avoids
  // setState-in-effect): when a new invoice arrives, reset during render.
  const [prevInvoice, setPrevInvoice] = useState(invoice);
  if (invoice !== prevInvoice) {
    setPrevInvoice(invoice);
    setCopied(false);
  }

  const link = invoice
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${invoice.token}`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (permissions) — user can still select the text
      setCopied(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-cyan-600" aria-hidden="true" />
            Secure payment link ready
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? `${invoice.invoiceNumber} — ${formatMoney(invoice.amount, invoice.currency)} for ${invoice.clientName}. Share this private link with your client: anyone who has it can view and pay the invoice.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <input
            readOnly
            value={link}
            aria-label="Payment link"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full truncate bg-transparent px-2 py-1.5 font-mono text-xs text-navy-800 outline-none"
          />
          <Button
            type="button"
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={copy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Copy
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          Treat this link like a password — it is the client&apos;s private access to this
          invoice. Sending it by email or WhatsApp is the usual practice.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Open payment page
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
