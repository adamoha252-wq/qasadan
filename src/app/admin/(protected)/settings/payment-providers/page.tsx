"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import { PageHeader, LoadingState, ErrorState, EmptyTableState } from "@/components/admin/ui-bits";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { ProviderCard } from "@/components/admin/payments/provider-card";
import { ConfigureProviderSheet } from "@/components/admin/payments/configure-sheet";
import { ProviderIcon } from "@/components/admin/payments/provider-icon";
import { getProviderDefinition, listProviderDefinitions } from "@/lib/payments/registry";
import type { ProviderPublicView } from "@/lib/payments/types";

/**
 * Admin Dashboard → Settings → Payment Providers (Phase 1).
 *
 * Everything on this page is registry-driven: adding a new provider to
 * src/lib/payments/registry.ts automatically makes it addable here.
 */

type CatalogEntry = {
  code: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  methods: string[];
};

type ComingSoonEntry = { code: string; name: string; tagline: string; icon: string };

type ProvidersResponse = {
  cryptoConfigured: boolean;
  providers: ProviderPublicView[];
  catalog: CatalogEntry[];
  comingSoon: ComingSoonEntry[];
};

export default function PaymentProvidersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addingCode, setAddingCode] = useState<string | null>(null);
  const [configureTarget, setConfigureTarget] = useState<ProviderPublicView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetch<ProvidersResponse>("/api/admin/payment-providers");
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payment providers");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openConfigure = (provider: ProviderPublicView) => {
    setConfigureTarget(provider);
    setSheetOpen(true);
  };

  const handleAdd = async (code: string) => {
    setAddingCode(code);
    try {
      const result = await apiFetch<{ provider: ProviderPublicView }>(
        "/api/admin/payment-providers",
        { method: "POST", body: JSON.stringify({ code }) }
      );
      toast({
        title: `${result.provider.name} added`,
        description: "Next: configure your credentials, test the connection, then activate it.",
      });
      setAddOpen(false);
      await load();
      // Open the configuration sheet straight away for a smooth setup flow.
      openConfigure(result.provider);
    } catch (e) {
      toast({
        title: "Could not add the provider",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setAddingCode(null);
    }
  };

  // Label lookups from the (client-safe) registry definitions.
  const methodLabel = (code: string) => {
    for (const def of listProviderDefinitions()) {
      const label = def.methods.find((m) => m.code === code)?.label;
      if (label) return label;
    }
    return code;
  };

  const hasProviders = (data?.providers.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payment Providers"
        description="Connect and manage the payment gateways used for client invoicing and checkout."
      >
        <Button
          onClick={() => setAddOpen(true)}
          disabled={data ? data.catalog.length === 0 : true}
          className="bg-navy-800 text-white hover:bg-navy-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Provider
        </Button>
      </PageHeader>

      <SettingsTabs />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <LoadingState label="Loading payment providers…" />
      ) : (
        <>
          {!data.cryptoConfigured && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                <strong>Server encryption key missing.</strong> Credentials cannot be saved
                until the server has a <code className="rounded bg-amber-100 px-1">PAYMENTS_MASTER_KEY</code>{" "}
                environment variable (a random 32-byte key). Ask your developer to set it — this
                is what keeps payment secrets unreadable even with database access.
              </p>
            </div>
          )}

          {hasProviders ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  methodLabels={methodLabel}
                  onConfigure={openConfigure}
                  onChanged={load}
                />
              ))}
            </div>
          ) : (
            <EmptyTableState message="No payment providers yet — add WAAFI Pay to start accepting secure payments." />
          )}

          {data.comingSoon.length > 0 && (
            <section aria-labelledby="pp-coming" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
              <h2 id="pp-coming" className="text-sm font-semibold text-slate-600">
                Coming soon
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                The provider framework supports adding more gateways without changing the checkout flow.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {data.comingSoon.map((entry) => (
                  <div
                    key={entry.code}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 opacity-70"
                  >
                    <ProviderIcon name={entry.icon} className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">{entry.name}</p>
                      <p className="text-xs text-slate-400">{entry.tagline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Add provider catalog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a payment provider</DialogTitle>
            <DialogDescription>
              Choose a gateway to connect. You can configure it right after adding.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {data?.catalog.length === 0 && (
              <p className="text-sm text-slate-500">
                All available providers have been added. More gateways are on the roadmap.
              </p>
            )}
            {data?.catalog.map((entry) => {
              const def = getProviderDefinition(entry.code);
              return (
                <div
                  key={entry.code}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-cyan-400"
                    >
                      <ProviderIcon name={entry.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy-800">{entry.name}</p>
                      <p className="text-xs text-slate-500">{entry.tagline}</p>
                      {def && def.methods.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {def.methods.map((m) => m.label).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAdd(entry.code)}
                    disabled={addingCode !== null}
                    className="shrink-0 bg-navy-800 text-white hover:bg-navy-700"
                  >
                    {addingCode === entry.code ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Configure sheet */}
      <ConfigureProviderSheet
        provider={configureTarget}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setConfigureTarget(null);
        }}
        onSaved={load}
      />
    </div>
  );
}
