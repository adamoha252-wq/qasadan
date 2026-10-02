"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, slugify, ApiError } from "@/lib/admin/api";
import { projectSchema } from "@/lib/admin/schemas";
import { Field, TextInput, TextArea, SwitchField } from "@/components/admin/form-kit";

export type ProjectForm = {
  title: string;
  slug: string;
  client: string;
  category: string;
  summary: string;
  content: string;
  technologies: string;
  externalUrl: string;
  coverImage: string;
  isFeatured: boolean;
  isPublished: boolean;
  completedAt: string;
  order: number;
};

export type ProjectImageRow = { id: string; url: string; caption: string | null; order: number };

export const emptyProject: ProjectForm = {
  title: "",
  slug: "",
  client: "",
  category: "",
  summary: "",
  content: "",
  technologies: "",
  externalUrl: "",
  coverImage: "",
  isFeatured: false,
  isPublished: false,
  completedAt: "",
  order: 0,
};

/** Shared project editor used by /admin/portfolio/new and /admin/portfolio/[id]. */
export function ProjectEditor({
  projectId,
  initial,
  initialImages = [],
}: {
  projectId?: string;
  initial: ProjectForm;
  initialImages?: ProjectImageRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ProjectForm>(initial);
  const [images, setImages] = useState<ProjectImageRow[]>(initialImages);
  const [newImage, setNewImage] = useState({ url: "", caption: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const buildPayload = () => ({
    title: form.title,
    slug: form.slug || slugify(form.title),
    client: form.client,
    category: form.category,
    summary: form.summary,
    content: form.content,
    technologies: form.technologies.split(",").map((t) => t.trim()).filter(Boolean),
    externalUrl: form.externalUrl,
    coverImage: form.coverImage,
    isFeatured: form.isFeatured,
    isPublished: form.isPublished,
    completedAt: form.completedAt,
    order: Number(form.order) || 0,
  });

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload();
      const parsed = projectSchema.safeParse(payload);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the form fields.");
        return;
      }
      if (projectId) {
        await apiFetch(`/api/admin/projects/${projectId}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        // Sync images
        await apiFetch(`/api/admin/projects/${projectId}/images`, {
          method: "PUT",
          body: JSON.stringify({
            images: images.map((img, i) => ({ url: img.url, caption: img.caption || "", order: i })),
          }),
        });
        toast({ title: "Project updated" });
      } else {
        const { project } = await apiFetch<{ project: { id: string } }>("/api/admin/projects", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        if (images.length > 0) {
          await apiFetch(`/api/admin/projects/${project.id}/images`, {
            method: "PUT",
            body: JSON.stringify({
              images: images.map((img, i) => ({ url: img.url, caption: img.caption || "", order: i })),
            }),
          });
        }
        toast({ title: "Project created" });
        router.push(`/admin/portfolio/${project.id}`);
        router.refresh();
        return;
      }
      router.refresh();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="border-navy-200 text-navy-800">
            <Link href="/admin/portfolio" aria-label="Back to portfolio list">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-navy-800">
              {projectId ? "Edit Project" : "New Project"}
            </h1>
            <p className="text-sm text-slate-500">
              {projectId
                ? "Changes appear on the public website immediately."
                : "Create a portfolio project — publish when ready."}
            </p>
          </div>
        </div>
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
              {projectId ? "Save changes" : "Create project"}
            </>
          )}
        </Button>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="proj-basics">
            <h2 id="proj-basics" className="font-heading text-base font-semibold text-navy-800">
              Basics
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="pj-title" required>
                  <TextInput
                    id="pj-title"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Al-Huda Primary & Secondary School"
                  />
                </Field>
                <Field label="Slug" htmlFor="pj-slug" hint="URL segment, e.g. al-huda-school" required>
                  <TextInput
                    id="pj-slug"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder={slugify(form.title) || "al-huda-school"}
                  />
                </Field>
                <Field label="Client" htmlFor="pj-client">
                  <TextInput
                    id="pj-client"
                    value={form.client}
                    onChange={(e) => set("client", e.target.value)}
                    placeholder="Client name"
                  />
                </Field>
                <Field label="Category" htmlFor="pj-category" hint="Used for portfolio filtering">
                  <TextInput
                    id="pj-category"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    placeholder="Web Development"
                  />
                </Field>
              </div>
              <Field label="Summary" htmlFor="pj-summary" hint="Shown on cards and search results" required>
                <TextArea
                  id="pj-summary"
                  rows={3}
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </Field>
              <Field
                label="Case study content"
                htmlFor="pj-content"
                hint="Markdown supported: ## headings, **bold**, lists"
              >
                <TextArea
                  id="pj-content"
                  rows={12}
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder={"## The Challenge\n\nWhat problem did the client face?\n\n## What We Delivered\n\n- Key deliverable one\n- Key deliverable two"}
                />
              </Field>
            </div>
          </section>

          {/* Image gallery manager */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="proj-gallery">
            <h2 id="proj-gallery" className="font-heading text-base font-semibold text-navy-800">
              Gallery images
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Shown on the public case-study page below the content.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                >
                  { }
                  <img
                    src={img.url}
                    alt={img.caption || `Gallery image ${i + 1}`}
                    className="h-16 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <TextInput
                      aria-label={`Image ${i + 1} URL`}
                      value={img.url}
                      onChange={(e) =>
                        setImages(images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                      }
                    />
                    <TextInput
                      aria-label={`Image ${i + 1} caption`}
                      value={img.caption || ""}
                      placeholder="Caption (optional)"
                      onChange={(e) =>
                        setImages(images.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-50"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 p-3 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <TextInput
                    aria-label="New image URL"
                    placeholder="Image URL (upload available in Storage phase)"
                    value={newImage.url}
                    onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                  />
                  <TextInput
                    aria-label="New image caption"
                    placeholder="Caption (optional)"
                    value={newImage.caption}
                    onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newImage.url.trim()) return;
                    setImages([...images, { id: `new-${Date.now()}`, url: newImage.url.trim(), caption: newImage.caption, order: images.length }]);
                    setNewImage({ url: "", caption: "" });
                  }}
                  className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="proj-status">
            <h2 id="proj-status" className="font-heading text-base font-semibold text-navy-800">
              Status
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <SwitchField
                id="pj-published"
                label="Published"
                description="Visible on the public website."
                checked={form.isPublished}
                onCheckedChange={(v) => set("isPublished", v)}
              />
              <SwitchField
                id="pj-featured"
                label="Featured"
                description="Shown on the homepage."
                checked={form.isFeatured}
                onCheckedChange={(v) => set("isFeatured", v)}
              />
              <Field label="Display order" htmlFor="pj-order" hint="Lower numbers appear first">
                <TextInput
                  id="pj-order"
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => set("order", Number(e.target.value))}
                />
              </Field>
              <Field label="Completion date" htmlFor="pj-date" hint="Optional">
                <TextInput
                  id="pj-date"
                  type="date"
                  value={form.completedAt}
                  onChange={(e) => set("completedAt", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="proj-links">
            <h2 id="proj-links" className="font-heading text-base font-semibold text-navy-800">
              Links &amp; cover
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <Field label="External URL" htmlFor="pj-ext" hint="Live project link (optional)">
                <TextInput
                  id="pj-ext"
                  type="url"
                  value={form.externalUrl}
                  onChange={(e) => set("externalUrl", e.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Cover image URL" htmlFor="pj-cover" hint="Shown on cards (optional)">
                <TextInput
                  id="pj-cover"
                  value={form.coverImage}
                  onChange={(e) => set("coverImage", e.target.value)}
                  placeholder="/api/media/… or https://…"
                />
              </Field>
              <Field label="Technologies" htmlFor="pj-tech" hint="Comma separated">
                <TextInput
                  id="pj-tech"
                  value={form.technologies}
                  onChange={(e) => set("technologies", e.target.value)}
                  placeholder="Next.js, TypeScript, Tailwind CSS"
                />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
