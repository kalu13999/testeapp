
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";
import CorrectionViewClient from "../correction-view-client";
import ProcessingViewClient from "../processing-view-client";
import { ClipboardCheck, FileSearch2, FileText, PencilRuler, PlayCircle, ArrowDownToLine, ScanLine, Warehouse, FileCog, Loader2, FileCheck2, Send, ThumbsDown, Undo2, CheckCheck, Archive, FileClock } from "lucide-react";

const STAGE_CONFIG: { [key: string]: any } = {
  'pending-shipment': {
    title: "Pending Shipment",
    description: "Books registered in the system but not yet shipped by the client.",
    emptyStateText: "There are no books awaiting shipment from clients.",
    dataType: 'book',
    dataStatus: 'Pending',
    viewType: 'list',
  },
  reception: {
    title: "Document Reception",
    description: "Books marked as shipped and are awaiting physical confirmation.",
    actionButtonLabel: "Assign & Confirm",
    actionButtonIcon: "Check",
    emptyStateText: "No books are currently in transit from clients.",
    dataType: 'book',
    dataStatus: 'In Transit',
    viewType: 'list',
  },
  'to-scan': {
    title: "To Scan Queue",
    description: "Books that have been received and are ready to be scanned.",
    actionButtonLabel: "Start Scanning",
    actionButtonIcon: "Play",
    emptyStateText: "No books in the 'To Scan' queue for you.",
    dataType: 'book',
    dataStatus: 'To Scan',
    viewType: 'list',
    assigneeRole: 'scanner',
  },
  'scanning-started': {
    title: "Scanning Started",
    description: "Books that are currently being actively scanned.",
    actionButtonLabel: "Mark as Complete",
    actionButtonIcon: "ScanLine",
    emptyStateText: "No books are currently being scanned by you.",
    dataType: 'book',
    dataStatus: 'Scanning Started',
    viewType: 'list',
    assigneeRole: 'scanner',
  },
  storage: {
    title: "Storage",
    description: "Scanned documents are organized by book. Assign books to an indexer.",
    actionButtonLabel: "Assign for Indexing",
    actionButtonIcon: "UserPlus",
    emptyStateText: "No scanned documents are waiting in storage.",
    dataStage: 'Storage',
    viewType: 'folder',
  },
  'to-indexing': {
    title: "To Indexing Queue",
    description: "Books that have been assigned and are ready to be indexed.",
    actionButtonLabel: "Start Indexing",
    actionButtonIcon: "Play",
    emptyStateText: "No books in the 'To Indexing' queue for you.",
    dataType: 'book',
    dataStatus: 'To Indexing',
    viewType: 'list',
    assigneeRole: 'indexer',
  },
  'indexing-started': {
    title: "Indexing Started",
    description: "Books that are currently being indexed. Assign to a QC specialist when complete.",
    actionButtonLabel: "Mark as Complete",
    actionButtonIcon: "Send",
    emptyStateText: "No books are currently being indexed by you.",
    dataType: 'book',
    dataStatus: 'Indexing Started',
    viewType: 'list',
    assigneeRole: 'indexer',
  },
  'to-checking': {
    title: "To Checking Queue",
    description: "Books that have been indexed and are ready for initial quality control.",
    actionButtonLabel: "Start Checking",
    actionButtonIcon: "Play",
    emptyStateText: "No books in the 'To Checking' queue for you.",
    dataType: 'book',
    dataStatus: 'To Checking',
    viewType: 'list',
    assigneeRole: 'qc',
  },
  'checking-started': {
    title: "Checking Started",
    description: "Books that are currently undergoing initial quality control.",
    actionButtonLabel: "Mark as Complete",
    actionButtonIcon: "Play",
    emptyStateText: "No books are currently being checked by you.",
    dataType: 'book',
    dataStatus: 'Checking Started',
    viewType: 'list',
    assigneeRole: 'qc',
  },
  'ready-for-processing': {
    title: "Ready for Processing",
    description: "Books with documents ready for technical processing like OCR.",
    actionButtonLabel: "Start Processing",
    actionButtonIcon: "Play",
    emptyStateText: "No books are ready to be processed.",
    dataType: 'book',
    dataStatus: 'Ready for Processing', // Special key
    viewType: 'list',
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
