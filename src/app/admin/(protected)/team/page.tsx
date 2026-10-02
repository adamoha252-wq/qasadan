"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { apiFetch, ApiError } from "@/lib/admin/api";
import { teamMemberSchema } from "@/lib/admin/schemas";
import {
  PageHeader,
  DeleteButton,
  PublishBadge,
  LoadingState,
  ErrorState,
  EmptyTableState,
} from "@/components/admin/ui-bits";
import { Field, TextInput, TextArea, SwitchField } from "@/components/admin/form-kit";

type TeamRow = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  imageUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  order: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  role: "",
  bio: "",
  imageUrl: "",
  linkedinUrl: "",
  twitterUrl: "",
  order: 0,
  isActive: true,
};

export default function AdminTeamPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ members: TeamRow[] }>("/api/admin/team");
      setRows(data.members);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: TeamRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      role: row.role,
      bio: row.bio || "",
      imageUrl: row.imageUrl || "",
      linkedinUrl: row.linkedinUrl || "",
      twitterUrl: row.twitterUrl || "",
      order: row.order,
      isActive: row.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const parsed = teamMemberSchema.safeParse({
        ...form,
        order: Number(form.order) || 0,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the fields.");
        return;
      }
      if (editing) {
        await apiFetch(`/api/admin/team/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Team member updated" });
      } else {
        await apiFetch("/api/admin/team", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Team member added" });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/team/${id}`, { method: "DELETE" });
      toast({ title: "Team member removed" });
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
      <PageHeader title="Team" description="Team members shown on the Who We Are page.">
        <Button onClick={openCreate} className="bg-navy-800 text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Member
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading team…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyTableState message="No team members yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Member</th>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.imageUrl ? (
                           
                          <img src={row.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700"
                          >
                            {row.name.charAt(0)}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-navy-800">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.order}</td>
                    <td className="px-4 py-3">
                      <PublishBadge published={row.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="h-8 gap-1.5 px-2 text-navy-700 hover:bg-navy-50"
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(row.id)}
                          title={`Remove ${row.name}?`}
                          description="They will be removed from the public team page."
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
            <DialogDescription>Appears on the Who We Are page.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="tm-name" required>
                <TextInput id="tm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Role" htmlFor="tm-role" required>
                <TextInput id="tm-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Lead Designer" />
              </Field>
            </div>
            <Field label="Bio" htmlFor="tm-bio" hint="Short introduction (optional)">
              <TextArea id="tm-bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Photo URL" htmlFor="tm-photo" hint="Optional">
                <TextInput id="tm-photo" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </Field>
              <Field label="Display order" htmlFor="tm-order">
                <TextInput id="tm-order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
              <Field label="LinkedIn URL" htmlFor="tm-li" hint="Optional">
                <TextInput id="tm-li" type="url" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/…" />
              </Field>
              <Field label="X / Twitter URL" htmlFor="tm-tw" hint="Optional">
                <TextInput id="tm-tw" type="url" value={form.twitterUrl} onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })} placeholder="https://x.com/…" />
              </Field>
            </div>
            <SwitchField
              id="tm-active"
              label="Active"
              description="Inactive members are hidden from the website."
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
              {saving ? "Saving…" : editing ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
