"use client";

import { format } from "date-fns";
import {
  PlugZap,
  Power,
  PowerOff,
  Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import { DeleteButton } from "@/components/admin/ui-bits";
import { ProviderIcon } from "./provider-icon";
import { cn } from "@/lib/utils";
import type { ProviderPublicView, ProviderStatusKey } from "@/lib/payments/types";

const STATUS_STYLES: Record<ProviderStatusKey, string> = {
  NOT_CONNECTED: "bg-slate-100 text-slate-600 hover:bg-slate-100",
  INCOMPLETE: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  NOT_TESTED: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
  PARTIAL: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  CONNECTED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  ACTIVE: "bg-emerald-600 text-white hover:bg-emerald-600",
  FAILED: "bg-red-100 text-red-700 hover:bg-red-100",
};

const OUTCOME_TEXT: Record<string, string> = {
  PASS: "text-emerald-700",
  PARTIAL: "text-sky-700",
  FAIL: "text-red-700",
};

export function ProviderCard({
  provider,
  methodLabels,
  onConfigure,
  onChanged,
}: {
  provider: ProviderPublicView;
  methodLabels: (code: string) => string;
  onConfigure: (provider: ProviderPublicView) => void;
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const hasCredentials = Object.values(provider.credentials).some((c) => c.configured);

  const handleTest = async () => {
    try {
      const result = await apiFetch<{ outcome: string; message: string }>(
        `/api/admin/payment-providers/${provider.id}/test`,
        { method: "POST" }
      );
      toast({
        title:
          result.outcome === "PASS"
            ? "Connection successful"
            : result.outcome === "PARTIAL"
              ? "Partially verified"
              : "Connection failed",
        description: result.message,
        variant: result.outcome === "FAIL" ? "destructive" : undefined,
      });
    } catch (e) {
      toast({
        title: "Test failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      await onChanged();
    }
  };

  const handleToggleActive = async () => {
    try {
      await apiFetch(`/api/admin/payment-providers/${provider.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      toast({
        title: provider.isActive
          ? `${provider.name} deactivated`
          : `${provider.name} activated`,
        description: provider.isActive
          ? "It will no longer be offered at checkout."
          : "It can now be offered at checkout once fully configured.",
      });
    } catch (e) {
      toast({
        title: "Could not update the provider",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      await onChanged();
    }
  };

  const handleRemove = async () => {
    try {
      await apiFetch(`/api/admin/payment-providers/${provider.id}`, { method: "DELETE" });
      toast({ title: `${provider.name} removed` });
    } catch (e) {
      toast({
        title: "Remove failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      await onChanged();
    }
  };

  return (
    <article
      aria-label={`${provider.name} payment provider`}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-cyan-400"
          >
            <ProviderIcon name={provider.icon} className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-heading text-base font-semibold text-navy-800">
              {provider.name}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  "text-[11px] font-medium",
                  provider.isSandbox
                    ? "bg-violet-100 text-violet-800 hover:bg-violet-100"
                    : "bg-navy-100 text-navy-800 hover:bg-navy-100"
                )}
              >
                {provider.isSandbox ? "Sandbox" : "Live"}
              </Badge>
              <Badge className={cn("text-[11px] font-semibold", STATUS_STYLES[provider.status.key])}>
                {provider.status.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-500">{provider.description}</p>

      {/* Methods + currencies */}
      <div className="flex flex-wrap gap-1.5" aria-label="Enabled payment methods">
        {provider.methods.length > 0 ? (
          provider.methods.map((code) => (
            <span
              key={code}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
            >
              {methodLabels(code)}
            </span>
          ))
        ) : (
          <span className="text-xs italic text-slate-400">No payment methods enabled</span>
        )}
        {provider.currencies.map((code) => (
          <span
            key={code}
            className="rounded-md border border-cyan-100 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-800"
          >
            {code}
          </span>
        ))}
      </div>

      {/* Setup guidance / last test result */}
      <div className="rounded-xl bg-slate-50 p-3 text-xs" role="status">
        {provider.missingFields.length > 0 && (
          <p className="text-amber-700">
            Complete the setup — missing: <strong>{provider.missingFields.join(", ")}</strong>.
          </p>
        )}
        {provider.lastTest.at ? (
          <p className={cn("mt-1", OUTCOME_TEXT[provider.lastTest.outcome ?? "FAIL"] ?? "text-slate-600")}>
            Last tested {format(new Date(provider.lastTest.at), "d MMM yyyy, HH:mm")}:{" "}
            {provider.lastTest.message}
          </p>
        ) : (
          <p className="mt-1 text-slate-500">
            Not tested yet — run Test Connection to verify the credentials.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onConfigure(provider)}
          className="border-navy-200 text-navy-800 hover:bg-navy-50"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Configure
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleTest}
          disabled={!hasCredentials}
          aria-label={`Test connection for ${provider.name}`}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <PlugZap className="h-4 w-4" aria-hidden="true" />
          Test Connection
        </Button>
        {provider.isActive ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleActive}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <PowerOff className="h-4 w-4" aria-hidden="true" />
            Disable
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleToggleActive}
            disabled={!hasCredentials}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Power className="h-4 w-4" aria-hidden="true" />
            Activate
          </Button>
        )}
        <div className="ml-auto">
          <DeleteButton
            onConfirm={handleRemove}
            label="Remove"
            title={`Remove ${provider.name}?`}
            description="The provider and its stored credentials will be removed from this website. You can add it again at any time."
          />
        </div>
      </div>
    </article>
  );
}
