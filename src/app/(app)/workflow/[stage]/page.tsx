
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";
import CorrectionViewClient from "../correction-view-client";

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
    actionButtonLabel: "Send to Quality Control",
    actionButtonIcon: "FileJson",
    emptyStateText: "No documents to index.",
    dataType: 'document',
    dataStage: "Indexing",
    viewType: 'folder',
  },
  'quality-control': {
    title: "Quality Control",
    description: "Initial check on documents for scanning quality and completeness.",
    actionButtonLabel: "Send to Processing",
    actionButtonIcon: "Play",
    emptyStateText: "No documents for initial QC.",
    dataType: 'document',
    dataStage: "Quality Control",
    viewType: 'folder',
  },
  processing: {
    title: "Processing",
    description: "Documents ready for technical processing like OCR.",
    actionButtonLabel: "Send to Final QC",
    actionButtonIcon: "Play",
    emptyStateText: "No documents to process.",
    dataType: 'document',
    dataStage: "Processing",
    viewType: 'folder',
  },
  'final-quality-control': {
    title: "Final Quality Control",
    description: "Review documents for quality and accuracy before delivery.",
    actionButtonLabel: "Approve for Delivery",
    actionButtonIcon: "ThumbsUp",
    emptyStateText: "No documents for final QC.",
    dataType: 'document',
    dataStage: "Final Quality Control",
    viewType: 'folder',
  },
  delivery: {
    title: "Delivery",
    description: "Documents approved and ready for delivery to the client.",
    actionButtonLabel: "Send to Client",
    actionButtonIcon: "Send",
    emptyStateText: "No documents to deliver.",
    dataType: 'document',
    dataStage: "Delivery",
    viewType: 'folder',
  },
  'client-rejections': {
    title: "Client Rejections",
    description: "Books that have been rejected by the client and require correction.",
    actionButtonLabel: "Mark as Corrected",
    actionButtonIcon: "Undo2",
    emptyStateText: "No books have been rejected by clients.",
    dataStage: 'Client Rejected',
    viewType: 'correction'
  },
  corrected: {
    title: "Corrected Books",
    description: "Books that have been corrected and are ready to be re-submitted to the workflow.",
    emptyStateText: "There are no corrected books.",
    dataType: 'document',
    dataStage: 'Corrected',
    viewType: 'folder'
  }
};

export default async function WorkflowStagePage({ params }: { params: { stage: string } }) {
    const config = STAGE_CONFIG[params.stage];
    if (!config) {
        notFound();
    }
    
    if (config.viewType === 'folder') {
      return <FolderViewClient config={config} stage={params.stage} />;
    }
    
    if (config.viewType === 'correction') {
      return <CorrectionViewClient config={config} stage={params.stage} />;
    }
    
    return <WorkflowClient config={config} stage={params.stage} />;
}
