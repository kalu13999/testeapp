import { getDocumentsByStage } from "@/lib/data";
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import { 
    Check, ScanLine, Warehouse, FileText, FileJson, FileSearch2, Send, Play, ThumbsUp, ThumbsDown, Undo2
} from "lucide-react";

const STAGE_CONFIG: { [key: string]: any } = {
  requests: {
    title: "Requests Received",
    description: "New client requests waiting to be marked as received.",
    actionButtonLabel: "Mark as Received",
    actionButtonIcon: Check,
    emptyStateText: "No pending requests.",
    dataStage: "Requests",
  },
  reception: {
    title: "Document Reception",
    description: "Physical documents that have been received and are awaiting scanning.",
    actionButtonLabel: "Send to Scanning",
    actionButtonIcon: ScanLine,
    emptyStateText: "No documents in reception.",
    dataStage: "Reception",
  },
  scanning: {
    title: "Scanning",
    description: "Documents that have been scanned and are ready for storage.",
    actionButtonLabel: "Confirm Scanning",
    actionButtonIcon: Check,
    emptyStateText: "No documents in scanning queue.",
    dataStage: "Scanning",
  },
  storage: {
    title: "Storage",
    description: "Documents in storage, awaiting indexing.",
    actionButtonLabel: "Start Indexing",
    actionButtonIcon: FileText,
    emptyStateText: "No documents in storage.",
    dataStage: "Storage",
  },
  indexing: {
    title: "Indexing",
    description: "Documents that are currently being indexed with metadata.",
    actionButtonLabel: "Send to Processing",
    actionButtonIcon: FileJson,
    emptyStateText: "No documents to index.",
    dataStage: "Indexing",
  },
  processing: {
    title: "Processing",
    description: "Documents ready for technical processing like OCR.",
    actionButtonLabel: "Run Script",
    actionButtonIcon: Play,
    emptyStateText: "No documents to process.",
    dataStage: "Processing",
  },
  'quality-control': {
    title: "Quality Control",
    description: "Review documents for quality and accuracy before delivery.",
    // This stage has multiple actions, so we won't use the generic button.
    emptyStateText: "No documents for QC.",
    dataStage: "Quality Control",
  },
  delivery: {
    title: "Delivery",
    description: "Documents approved and ready for delivery to the client.",
    actionButtonLabel: "Deliver to Client",
    actionButtonIcon: Send,
    emptyStateText: "No documents to deliver.",
    dataStage: "Delivery",
  },
};

export default async function WorkflowStagePage({ params }: { params: { stage: string } }) {
    const config = STAGE_CONFIG[params.stage];
    if (!config) {
        notFound();
    }
    const documents = await getDocumentsByStage(config.dataStage);

    return <WorkflowClient documents={documents} config={config} stage={params.stage} />;
}
