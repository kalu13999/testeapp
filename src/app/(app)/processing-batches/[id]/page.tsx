import BatchDetailClient from "./client";

export default function BatchDetailPage({ params }: { params: { id: string } }) {
    return <BatchDetailClient batchId={params.id} />;
}
