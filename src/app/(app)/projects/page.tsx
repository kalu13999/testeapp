
import { getProjects, getClients } from "@/lib/data";
import ProjectsClient from "./client";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    getProjects(),
    getClients(),
  ]);
  return <ProjectsClient projects={projects} clients={clients} />;
}
