
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";

const STAGE_CONFIG: { [key: string]: any } = {
  reception: {
    title: "Document Reception",
    description: "Books that have been added to a project manifest but are awaiting physical confirmation.",
    actionButtonLabel: "Confirm Receipt",
    actionButtonIcon: "Check",
    emptyStateText: "No books are awaiting reception.",
    dataType: 'book',
    dataStatus: 'Pending',
    viewType: 'list',
  },
  scanning: {
    title: "Scanning Queue",
    description: "Physical books that have been received and are awaiting scanning.",
    actionButtonLabel: "Confirm Scanning",
    actionButtonIcon: "ScanLine",
    emptyStateText: "No books in the scanning queue.",
    dataType: 'book',
    dataStatus: 'Received',
    viewType: 'list',
  },
  storage: {
    title: "Storage",
    description: "Scanned documents are organized by book. Promote books to the next stage.",
    actionButtonLabel: "Send to Indexing",
    actionButtonIcon: "FileText",
    emptyStateText: "No scanned documents are waiting in storage.",
    dataType: 'document',
    dataStage: 'Storage',
    viewType: 'folder',
  },
  indexing: {
    title: "Indexing",
    description: "Documents that have been scanned and are ready for metadata assignment.",
    actionButtonLabel: "Send to Processing",
    actionButtonIcon: "FileJson",
    emptyStateText: "No documents to index.",
    dataType: 'document',
    dataStage: "Indexing",
    viewType: 'folder',
  },
  processing: {
    title: "Processing",
    description: "Documents ready for technical processing like OCR.",
    actionButtonLabel: "Send to QC",
    actionButtonIcon: "Play",
    emptyStateText: "No documents to process.",
    dataType: 'document',
    dataStage: "Processing",
    viewType: 'folder',
  },
  'quality-control': {
    title: "Quality Control",
    description: "Review documents for quality and accuracy before delivery.",
    actionButtonLabel: "Approve for Delivery",
    actionButtonIcon: "ThumbsUp",
    emptyStateText: "No documents for QC.",
    dataType: 'document',
    dataStage: "Quality Control",
    viewType: 'folder',
  },
  delivery: {
    title: "Delivery",
    description: "Documents approved and ready for delivery to the client.",
    actionButtonLabel: "Finalize Delivery",
    actionButtonIcon: "Send",
    emptyStateText: "No documents to deliver.",
    dataType: 'document',
    dataStage: "Delivery",
    viewType: 'folder',
  },
};

export default async function WorkflowStagePage({ params }: { params: { stage: string } }) {
    const config = STAGE_CONFIG[params.stage];
    if (!config) {
        notFound();
    }
    
    if (config.viewType === 'folder') {
      return <FolderViewClient config={config} stage={params.stage} />;
    }
    
    return <WorkflowClient config={config} stage={params.stage} />;
}
