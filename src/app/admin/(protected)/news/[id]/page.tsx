"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArticleEditor, type ArticleForm } from "@/components/admin/article-editor";
import { LoadingState, ErrorState } from "@/components/admin/ui-bits";

type ApiArticle = ArticleForm & { id: string };

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<{
    status: "loading" | "error" | "ready";
    form?: ArticleForm;
    categories?: { id: string; name: string }[];
    message?: string;
  }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [artRes, catRes] = await Promise.all([
          fetch(`/api/admin/articles/${id}`),
          fetch("/api/admin/categories"),
        ]);
        if (artRes.status === 401 || catRes.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!artRes.ok) throw new Error("Failed to load article");
        const { article } = await artRes.json();
        const { categories } = await catRes.json();
        if (cancelled) return;
        const a = article as ApiArticle;
        setState({
          status: "ready",
          form: {
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt || "",
            content: a.content,
            categoryId: a.categoryId || "",
            coverImage: a.coverImage || "",
            isPublished: a.isPublished,
            isArchived: a.isArchived,
          },
          categories,
        });
      } catch (e) {
        if (!cancelled) {
          setState({ status: "error", message: e instanceof Error ? e.message : "Failed to load" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <LoadingState label="Loading article…" />;
  if (state.status === "error") return <ErrorState message={state.message || "Failed to load"} />;
  return <ArticleEditor articleId={id} initial={state.form!} categories={state.categories!} />;
}
