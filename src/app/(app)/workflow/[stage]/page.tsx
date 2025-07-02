
import { notFound } from "next/navigation";
import WorkflowClient from "./client";

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
    actionButtonLabel: "Confirm Scanning",
    actionButtonIcon: "ScanLine",
    emptyStateText: "No books in the scanning queue.",
    dataType: 'book',
    dataStatus: 'Received',
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

export default async function WorkflowStagePage({ params }: { params: { stage: string } }) {
    const config = STAGE_CONFIG[params.stage];
    if (!config) {
        notFound();
    }
    
    // Data is now supplied by the WorkflowProvider context, so the client component handles fetching.
    return <WorkflowClient config={config} stage={params.stage} />;
}
