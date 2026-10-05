"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import { Field, TextInput, SwitchField } from "@/components/admin/form-kit";
import { getProviderDefinition } from "@/lib/payments/registry";
import type { ProviderDefinition, ProviderPublicView } from "@/lib/payments/types";

/**
 * Configure a payment provider: credentials (encrypted server-side),
 * environment, payment methods and currencies.
 *
 * Security UX:
 *  - Secret fields are NEVER displayed — they render as blank password
 *    inputs; leaving them blank keeps the stored value untouched.
 *  - Only the typed values are sent to the server, which encrypts them
 *    (AES-256-GCM) before storing.
 *
 * The form state is initialized from the provider snapshot and reset by
 * React's `key` (provider id) — no effects, no cascading renders.
 */
export function ConfigureProviderSheet({
  provider,
  open,
  onOpenChange,
  onSaved,
}: {
  provider: ProviderPublicView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {provider && (
          <ConfigureForm
            key={provider.id}
            provider={provider}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ConfigureForm({
  provider,
  onOpenChange,
  onSaved,
}: {
  provider: ProviderPublicView;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const def = getProviderDefinition(provider.code) as ProviderDefinition | undefined;
  const [form, setForm] = useState(() => buildForm(provider));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  if (!def) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">
          This provider is no longer supported by the system.
        </p>
      </div>
    );
  }

  const toggleCode = (list: string[], code: string): string[] =>
    list.includes(code) ? list.filter((c) => c !== code) : [...list, code];

  const handleSave = async () => {
    setFormError(null);

    if (form.methods.length === 0) {
      setFormError("Enable at least one payment method.");
      return;
    }
    if (form.currencies.length === 0) {
      setFormError("Enable at least one currency.");
      return;
    }

    // Build the credentials patch:
    //  - identifiers: always sent (empty string removes the field)
    //  - secrets: only sent when the admin typed a new value
    const credentials: Record<string, string> = {};
    for (const field of def.credentialFields) {
      if (field.secret) {
        const typed = (form.secrets[field.key] || "").trim();
        if (typed) credentials[field.key] = typed;
      } else {
        credentials[field.key] = (form.identifiers[field.key] || "").trim();
      }
    }

    setSaving(true);
    try {
      await apiFetch(`/api/admin/payment-providers/${provider.id}`, {
        method: "PUT",
        body: JSON.stringify({
          isSandbox: form.isSandbox,
          methods: form.methods,
          currencies: form.currencies,
          credentials,
        }),
      });
      toast({
        title: "Configuration saved",
        description:
          "Credentials are encrypted and stored server-side only. Run Test Connection to verify them.",
      });
      onOpenChange(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the configuration.");
    } finally {
      setSaving(false);
      await onSaved();
    }
  };

  return (
    <>
      <SheetHeader className="border-b border-slate-200">
        <SheetTitle className="font-heading text-lg text-navy-800">
          Configure {provider.name}
        </SheetTitle>
        <SheetDescription>
          Credentials are encrypted (AES-256-GCM) and never exposed to the browser.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        {/* Environment */}
        <SwitchField
          id="pp-sandbox"
          label={
            form.isSandbox ? "Sandbox environment (test mode)" : "Live environment (real money)"
          }
          description={
            form.isSandbox
              ? "Calls go to WAAFI Pay's sandbox — safe for testing. Switch off when you are ready to accept real payments."
              : "Calls go to WAAFI Pay's production API. Only enable after successful live verification."
          }
          checked={form.isSandbox}
          onCheckedChange={(v) => setForm({ ...form, isSandbox: v })}
        />

        {/* Credential groups */}
        {def.credentialGroups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="text-sm font-semibold text-navy-800">{group.title}</h3>
            {group.description && (
              <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
            )}
            <div className="mt-3 flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
              {group.fieldKeys.map((key) => {
                const field = def.credentialFields.find((f) => f.key === key);
                if (!field) return null;
                const view = provider.credentials[key];

                if (field.secret) {
                  return (
                    <Field
                      key={key}
                      label={field.label}
                      htmlFor={`cred-${key}`}
                      hint={
                        view?.configured
                          ? `Current key: ${view.masked} — leave blank to keep it.`
                          : field.hint
                      }
                    >
                      <TextInput
                        id={`cred-${key}`}
                        type={showSecrets ? "text" : "password"}
                        autoComplete="off"
                        value={form.secrets[key] ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            secrets: { ...form.secrets, [key]: e.target.value },
                          })
                        }
                        placeholder={field.placeholder}
                      />
                    </Field>
                  );
                }

                return (
                  <Field key={key} label={field.label} htmlFor={`cred-${key}`} hint={field.hint}>
                    <TextInput
                      id={`cred-${key}`}
                      type="text"
                      autoComplete="off"
                      value={form.identifiers[key] ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          identifiers: { ...form.identifiers, [key]: e.target.value },
                        })
                      }
                      placeholder={field.placeholder}
                    />
                  </Field>
                );
              })}
            </div>
          </section>
        ))}

        {/* Payment methods */}
        <section aria-labelledby="pp-methods">
          <h3 id="pp-methods" className="text-sm font-semibold text-navy-800">
            Payment methods
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Only enable the methods actually available on your merchant account.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {def.methods.map((method) => {
              const id = `method-${method.code}`;
              const checked = form.methods.includes(method.code);
              return (
                <label
                  key={method.code}
                  htmlFor={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    checked ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-white"
                  }`}
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={() =>
                      setForm({ ...form, methods: toggleCode(form.methods, method.code) })
                    }
                    className="mt-0.5"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-navy-800">{method.label}</span>
                    {method.description && (
                      <span className="text-xs text-slate-500">{method.description}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Currencies */}
        <section aria-labelledby="pp-currencies">
          <h3 id="pp-currencies" className="text-sm font-semibold text-navy-800">
            Currencies
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Currencies clients can pay in. Invoices will use one of these.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {def.currencies.map((currency) => {
              const active = form.currencies.includes(currency.code);
              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      currencies: toggleCode(form.currencies, currency.code),
                    })
                  }
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-cyan-400 bg-cyan-50 text-cyan-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {currency.code}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {currency.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-xl bg-navy-50 p-3 text-xs text-navy-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Secrets are transmitted over HTTPS, encrypted with AES-256-GCM and stored server-side
          only. They are never rendered in the browser, logged, or committed to source control.
        </p>

        <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={showSecrets}
            onChange={() => setShowSecrets((v) => !v)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {showSecrets ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Show typed secret values
        </label>
      </div>

      <SheetFooter className="border-t border-slate-200 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-navy-800 text-white hover:bg-navy-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save configuration
            </>
          )}
        </Button>
      </SheetFooter>
    </>
  );
}

function buildForm(provider: ProviderPublicView) {
  const def = getProviderDefinition(provider.code);
  const identifiers: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const field of def?.credentialFields ?? []) {
    if (field.secret) {
      secrets[field.key] = "";
    } else {
      identifiers[field.key] = provider.credentials[field.key]?.value ?? "";
    }
  }
  return {
    isSandbox: provider.isSandbox,
    identifiers,
    secrets,
    methods: [...provider.methods],
    currencies: [...provider.currencies],
  };
}
