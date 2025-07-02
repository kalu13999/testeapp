
import { getProjectById, getClients } from "@/lib/data";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./client";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const [project, clients] = await Promise.all([
        getProjectById(params.id),
        getClients()
    ]);

    if (!project) {
        notFound();
    }

    return <ProjectDetailClient project={project} clients={clients} />;
}
