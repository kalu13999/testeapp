import DocumentDetailClient from "./client";

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    return <DocumentDetailClient docId={id} btnNavigation={true}/>;
}