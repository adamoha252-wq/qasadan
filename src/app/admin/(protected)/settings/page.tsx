"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/admin/ui-bits";
import { Field, TextInput } from "@/components/admin/form-kit";

type SettingsMap = Record<string, string>;

const SETTING_FIELDS: { key: string; label: string; hint?: string; type?: string }[] = [
  { key: "contact.email", label: "Contact email", hint: "Shown on the contact page and footer" },
  { key: "contact.phone", label: "Contact phone" },
  { key: "contact.address", label: "Office address" },
  { key: "site.tagline", label: "Site tagline" },
  { key: "social.facebook", label: "Facebook URL", type: "url" },
  { key: "social.twitter", label: "X / Twitter URL", type: "url" },
  { key: "social.linkedin", label: "LinkedIn URL", type: "url" },
  { key: "social.instagram", label: "Instagram URL", type: "url" },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<{ settings: SettingsMap }>("/api/admin/settings");
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ values: settings }),
      });
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site Settings" />
      <ErrorState message={error} onRetry={load} />
    </div>
  );
  if (!settings) return <LoadingState label="Loading settings…" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site Settings" description="Contact details and social links used across the website.">
        <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save settings
            </>
          )}
        </Button>
      </PageHeader>

      <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="settings-contact">
        <h2 id="settings-contact" className="font-heading text-base font-semibold text-navy-800">
          Contact &amp; general
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SETTING_FIELDS.slice(0, 4).map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`set-${f.key}`} hint={f.hint}>
              <TextInput
                id={`set-${f.key}`}
                type={f.type || "text"}
                value={settings[f.key] || ""}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="settings-social">
        <h2 id="settings-social" className="font-heading text-base font-semibold text-navy-800">
          Social media links
        </h2>
        <p className="mt-1 text-xs text-slate-500">Used by the footer social icons.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SETTING_FIELDS.slice(4).map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`set-${f.key}`}>
              <TextInput
                id={`set-${f.key}`}
                type="url"
                value={settings[f.key] || ""}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          ))}
        </div>
      </section>
    </div>
  );
}
