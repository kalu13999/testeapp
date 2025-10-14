
import { getEnrichedProjectById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./client";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    // This now fetches from a list of all projects, so it should find the project
    // regardless of the user's current global selection.
    const { id } = await params;
    const project = await getEnrichedProjectById(id);

    if (!project) {
        notFound();
    }

    return <ProjectDetailClient projectId={id} />;
}
