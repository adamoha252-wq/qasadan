"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, slugify, ApiError } from "@/lib/admin/api";
import { articleSchema } from "@/lib/admin/schemas";
import { Field, TextInput, TextArea, SwitchField, SelectField } from "@/components/admin/form-kit";

export type ArticleForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  coverImage: string;
  isPublished: boolean;
  isArchived: boolean;
};

export const emptyArticle: ArticleForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  categoryId: "",
  coverImage: "",
  isPublished: false,
  isArchived: false,
};

export function ArticleEditor({
  articleId,
  initial,
  categories,
}: {
  articleId?: string;
  initial: ArticleForm;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ArticleForm>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt,
        content: form.content,
        categoryId: form.categoryId,
        coverImage: form.coverImage,
        isPublished: form.isPublished,
        isArchived: form.isArchived,
      };
      const parsed = articleSchema.safeParse(payload);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Please check the form fields.");
        return;
      }
      if (articleId) {
        await apiFetch(`/api/admin/articles/${articleId}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Article updated" });
        router.refresh();
      } else {
        const { article } = await apiFetch<{ article: { id: string } }>("/api/admin/articles", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast({ title: "Article created" });
        router.push(`/admin/news/${article.id}`);
        router.refresh();
        return;
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save article.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="border-navy-200 text-navy-800">
            <Link href="/admin/news" aria-label="Back to news list">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-navy-800">
              {articleId ? "Edit Article" : "New Article"}
            </h1>
            <p className="text-sm text-slate-500">News &amp; insights published on the public website.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              {articleId ? "Save changes" : "Create article"}
            </>
          )}
        </Button>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="art-main">
            <h2 id="art-main" className="sr-only">Article content</h2>
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="art-title" required>
                  <TextInput
                    id="art-title"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </Field>
                <Field label="Slug" htmlFor="art-slug" hint="URL segment" required>
                  <TextInput
                    id="art-slug"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder={slugify(form.title)}
                  />
                </Field>
              </div>
              <Field label="Excerpt" htmlFor="art-excerpt" hint="Short summary shown on cards">
                <TextArea
                  id="art-excerpt"
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                />
              </Field>
              <Field label="Content" htmlFor="art-content" hint="Markdown supported">
                <TextArea
                  id="art-content"
                  rows={14}
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="art-status">
            <h2 id="art-status" className="font-heading text-base font-semibold text-navy-800">
              Status
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <SwitchField
                id="art-published"
                label="Published"
                description="Visible on the public news page."
                checked={form.isPublished}
                onCheckedChange={(v) => set("isPublished", v)}
              />
              <SwitchField
                id="art-archived"
                label="Archived"
                description="Hidden from the public news page."
                checked={form.isArchived}
                onCheckedChange={(v) => set("isArchived", v)}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="art-meta">
            <h2 id="art-meta" className="font-heading text-base font-semibold text-navy-800">
              Meta
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <Field label="Category" htmlFor="art-category">
                <SelectField
                  id="art-category"
                  value={form.categoryId}
                  onValueChange={(v) => set("categoryId", v === "none" ? "" : v)}
                  options={[
                    { value: "none", label: "No category" },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="Select category"
                />
              </Field>
              <Field label="Cover image URL" htmlFor="art-cover" hint="Optional">
                <TextInput
                  id="art-cover"
                  value={form.coverImage}
                  onChange={(e) => set("coverImage", e.target.value)}
                  placeholder="/api/media/… or https://…"
                />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
