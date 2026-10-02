import { ProjectEditor, emptyProject } from "@/components/admin/project-editor";

export default function NewProjectPage() {
  return <ProjectEditor initial={emptyProject} />;
}
