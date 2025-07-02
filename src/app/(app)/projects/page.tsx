
import { getProjects } from "@/lib/data";
import ProjectsClient from "./client";

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsClient projects={projects} />;
}
