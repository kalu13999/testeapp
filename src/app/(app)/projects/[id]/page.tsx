
import { getProjectById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./client";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const project = await getProjectById(params.id);

    if (!project) {
        notFound();
    }

    return <ProjectDetailClient project={project} />;
}
