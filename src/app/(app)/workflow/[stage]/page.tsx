
import { getDocumentsByStage, getFolderContents, getBooksByStatus } from "@/lib/data";
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import StorageExplorer from "./storage-explorer";

const STAGE_CONFIG: { [key: string]: any } = {
  reception: {
    title: "Document Reception",
    description: "Books that have been added to a project manifest but are awaiting physical confirmation.",
    actionButtonLabel: "Confirm Receipt",
    actionButtonIcon: "Check",
    emptyStateText: "No books are awaiting reception.",
    dataType: 'book',
    dataStatus: 'Pending',
  },
  scanning: {
    title: "Scanning Queue",
    description: "Physical books that have been received and are awaiting scanning.",
    actionButtonLabel: "Start Scanning",
    actionButtonIcon: "ScanLine",
    emptyStateText: "No books in the scanning queue.",
    dataType: 'book',
    dataStatus: 'Received',
  },
  storage: {
    title: "Storage Explorer",
    description: "Documents in storage, awaiting indexing.",
    dataType: 'storage-explorer', // Special type for this page
  },
  indexing: {
    title: "Indexing",
    description: "Documents that have been scanned and are ready for metadata assignment.",
    actionButtonLabel: "Send to Processing",
    actionButtonIcon: "FileJson",
    emptyStateText: "No documents to index.",
    dataType: 'document',
    dataStage: "Indexing",
  },
  processing: {
    title: "Processing",
    description: "Documents ready for technical processing like OCR.",
    actionButtonLabel: "Run Script",
    actionButtonIcon: "Play",
    emptyStateText: "No documents to process.",
    dataType: 'document',
    dataStage: "Processing",
  },
  'quality-control': {
    title: "Quality Control",
    description: "Review documents for quality and accuracy before delivery.",
    emptyStateText: "No documents for QC.",
    dataType: 'document',
    dataStage: "Quality Control",
  },
  delivery: {
    title: "Delivery",
    description: "Documents approved and ready for delivery to the client.",
    actionButtonLabel: "Deliver to Client",
    actionButtonIcon: "Send",
    emptyStateText: "No documents to deliver.",
    dataType: 'document',
    dataStage: "Delivery",
  },
};

export default async function WorkflowStagePage({ params, searchParams }: { params: { stage: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
    const config = STAGE_CONFIG[params.stage];
    if (!config) {
        notFound();
    }
    
    if (config.dataType === 'storage-explorer') {
        const folderId = searchParams?.folderId && typeof searchParams.folderId === 'string' ? searchParams.folderId : null;
        const { folders, documents, breadcrumbs } = await getFolderContents(folderId);
        return <StorageExplorer folders={folders} documents={documents} breadcrumbs={breadcrumbs} />;
    }
    
    let items;
    if (config.dataType === 'book') {
        items = await getBooksByStatus(config.dataStatus);
    } else {
        items = await getDocumentsByStage(config.dataStage);
    }

    return <WorkflowClient items={items} config={config} stage={params.stage} />;
}
