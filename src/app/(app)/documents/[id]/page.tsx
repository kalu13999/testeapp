import DocumentDetailClient from "./client";

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
    return <DocumentDetailClient docId={params.id} />;
}
