"use client";

import { useEffect, useState } from "react";
import { ArticleEditor, emptyArticle } from "@/components/admin/article-editor";
import { LoadingState, ErrorState } from "@/components/admin/ui-bits";

export default function NewArticlePage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/categories");
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const data = await res.json();
        setCategories(data.categories);
      } catch {
        setError("Failed to load categories");
      }
    })();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!categories) return <LoadingState label="Loading editor…" />;
  return <ArticleEditor initial={emptyArticle} categories={categories} />;
}
