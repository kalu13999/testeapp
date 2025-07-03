
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";
import CorrectionViewClient from "../correction-view-client";
import ProcessingViewClient from "../processing-view-client";
import { PlayCircle } from "lucide-react";

const STAGE_CONFIG: { [key: string]: any } = {
  reception: {
    title: "Document Reception",
    description: "Books that are awaiting physical confirmation and scanner assignment.",
    actionButtonLabel: "Assign & Confirm",
    actionButtonIcon: "Check",
    emptyStateText: "No books are awaiting reception.",
    dataType: 'book',
    dataStatus: 'Pending',
    viewType: 'list',
  },
  'to-scan': {
    title: "To Scan Queue",
    description: "Books that have been received and are ready to be scanned.",
    actionButtonLabel: "Start Scanning",
    actionButtonIcon: "Play",
    emptyStateText: "No books in the 'To Scan' queue.",
    dataType: 'book',
    dataStatus: 'To Scan',
    viewType: 'list',
  },
  'scanning-started': {
    title: "Scanning Started",
    description: "Books that are currently being actively scanned.",
    actionButtonLabel: "Confirm Scan Completion",
    actionButtonIcon: "ScanLine",
    emptyStateText: "No books are currently being scanned.",
    dataType: 'book',
    dataStatus: 'Scanning Started',
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
  'ready-for-processing': {
    title: "Ready for Processing",
    description: "Documents ready for technical processing like OCR.",
    actionButtonLabel: "Start Processing",
    actionButtonIcon: "Play",
    emptyStateText: "No documents to process.",
    dataType: 'document',
    dataStage: "Ready for Processing",
    viewType: 'folder',
  },
  'in-processing': {
    title: "In Processing",
    description: "Monitoring documents currently being processed by automated scripts.",
    emptyStateText: "No documents are currently being processed.",
    dataStage: "In Processing",
    viewType: 'processing',
  },
  'processed': {
    title: "Processed",
    description: "Documents that have completed automated processing and are ready for final review.",
    actionButtonLabel: "Send to Final QC",
    actionButtonIcon: "Send",
    emptyStateText: "No documents have been processed.",
    dataType: 'document',
    dataStage: "Processed",
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

    if (config.viewType === 'processing') {
      return <ProcessingViewClient config={config} stage={params.stage} />;
    }
    
    return <WorkflowClient config={config} stage={params.stage} />;
}
