"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectEditor, type ProjectForm, type ProjectImageRow } from "@/components/admin/project-editor";
import { LoadingState, ErrorState } from "@/components/admin/ui-bits";

type ApiProject = {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  category: string | null;
  summary: string;
  content: string;
  technologies: string;
  externalUrl: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  completedAt: string | null;
  order: number;
  images: ProjectImageRow[];
};

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ready"; form: ProjectForm; images: ProjectImageRow[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/projects/${id}`);
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load project");
        }
        const { project } = (await res.json()) as { project: ApiProject };
        if (cancelled) return;
        setState({
          status: "ready",
          form: {
            title: project.title,
            slug: project.slug,
            client: project.client || "",
            category: project.category || "",
            summary: project.summary,
            content: project.content,
            technologies: JSON.parse(project.technologies || "[]").join(", "),
            externalUrl: project.externalUrl || "",
            coverImage: project.coverImage || "",
            isFeatured: project.isFeatured,
            isPublished: project.isPublished,
            completedAt: project.completedAt ? project.completedAt.slice(0, 10) : "",
            order: project.order,
          },
          images: project.images,
        });
      } catch (e) {
        if (!cancelled) {
          setState({ status: "error", message: e instanceof Error ? e.message : "Failed to load project" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <LoadingState label="Loading project…" />;
  if (state.status === "error") return <ErrorState message={state.message} />;
  return <ProjectEditor projectId={id} initial={state.form} initialImages={state.images} />;
}
