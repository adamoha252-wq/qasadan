"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/admin/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/admin/ui-bits";
import { Field, TextInput } from "@/components/admin/form-kit";
import { SettingsTabs } from "@/components/admin/settings-tabs";

type SettingsMap = Record<string, string>;

const SETTING_FIELDS: { key: string; label: string; hint?: string; type?: string }[] = [
  { key: "contact.email", label: "Contact email", hint: "Shown on the contact page and footer" },
  { key: "contact.phone", label: "Contact phone", hint: "Primary number, e.g. +252 612 307 888" },
  { key: "contact.phoneAlt", label: "Second phone", hint: "Optional alternate number" },
  { key: "contact.whatsapp", label: "WhatsApp number", hint: "Digits only with country code, e.g. 252612307888" },
  { key: "contact.address", label: "Office address" },
  { key: "site.tagline", label: "Site tagline" },
  { key: "social.facebook", label: "Facebook URL", type: "url" },
  { key: "social.twitter", label: "X / Twitter URL", type: "url" },
  { key: "social.linkedin", label: "LinkedIn URL", type: "url" },
  { key: "social.instagram", label: "Instagram URL", type: "url" },
];

const EMPTY_PW_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState(EMPTY_PW_FORM);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

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

      <SettingsTabs />

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

      <ChangePasswordSection
        form={pwForm}
        setForm={(next) => {
          setPwForm(next);
          setPwError(null);
        }}
        error={pwError}
        busy={pwBusy}
        showPw={showPw}
        onToggleShow={() => setShowPw((v) => !v)}
        onSubmit={async () => {
          setPwError(null);

          // Client-side checks first, for instant feedback
          if (pwForm.newPassword.length < 10) {
            setPwError("The new password must be at least 10 characters.");
            return;
          }
          if (!/[A-Za-z]/.test(pwForm.newPassword) || !/[0-9]/.test(pwForm.newPassword)) {
            setPwError("The new password must contain at least one letter and one number.");
            return;
          }
          if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError("The two new passwords do not match.");
            return;
          }
          if (pwForm.newPassword === pwForm.currentPassword) {
            setPwError("The new password must be different from the current one.");
            return;
          }

          setPwBusy(true);
          try {
            await apiFetch("/api/admin/auth/change-password", {
              method: "POST",
              body: JSON.stringify({
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
              }),
            });
            setPwForm(EMPTY_PW_FORM);
            toast({
              title: "Password updated",
              description: "Other devices have been logged out. Use the new password next time you sign in.",
            });
          } catch (e) {
            setPwError(e instanceof Error ? e.message : "Could not update the password. Try again.");
          } finally {
            setPwBusy(false);
          }
        }}
      />
    </div>
  );
}

function ChangePasswordSection({
  form,
  setForm,
  error,
  busy,
  showPw,
  onToggleShow,
  onSubmit,
}: {
  form: { currentPassword: string; newPassword: string; confirmPassword: string };
  setForm: (next: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  error: string | null;
  busy: boolean;
  showPw: boolean;
  onToggleShow: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6"
      aria-labelledby="settings-security"
    >
      <h2 id="settings-security" className="font-heading text-base font-semibold text-navy-800">
        Account security
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Change the password you use to sign in to this admin panel. Other devices will be logged
        out automatically after you change it.
      </p>

      <form
        className="mt-4 flex max-w-md flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Current password" htmlFor="pw-current" required>
          <TextInput
            id="pw-current"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="The password you signed in with"
          />
        </Field>

        <Field
          label="New password"
          htmlFor="pw-new"
          required
          hint="At least 10 characters, with at least one letter and one number."
        >
          <TextInput
            id="pw-new"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Your new password"
          />
        </Field>

        <Field label="Repeat new password" htmlFor="pw-confirm" required>
          <TextInput
            id="pw-confirm"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Type the new password again"
          />
        </Field>

        <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={showPw}
            onChange={onToggleShow}
            className="h-4 w-4 rounded border-slate-300"
          />
          {showPw ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Show passwords
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div>
          <Button
            type="submit"
            disabled={busy || !form.currentPassword || !form.newPassword || !form.confirmPassword}
            className="bg-navy-800 text-white hover:bg-navy-700"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Updating…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Update password
              </>
            )}
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Tip: use a unique password you don’t use anywhere else — for example three random
          words plus a number, like "copper-harbour-lake42".
        </p>
      </form>
    </section>
  );
}
