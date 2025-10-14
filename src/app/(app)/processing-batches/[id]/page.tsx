import BatchDetailClient from "./client";

export default async function BatchDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    return <BatchDetailClient batchId={id} />;
}
