
import { LucideIcon, ClipboardCheck, FileSearch2, FileText, PencilRuler, PlayCircle, ArrowDownToLine, ScanLine, Warehouse, FileCog, Loader2, FileCheck2, Send, ThumbsDown, Undo2, CheckCheck, Archive, FileClock, UserPlus, Check, Play } from "lucide-react";

type StageConfig = {
  [key: string]: {
    title: string;
    description: string;
    viewType: 'list' | 'folder' | 'correction' | 'processing';
    emptyStateText: string;
    dataType: 'book' | 'document';
    actionButtonLabel?: string;
    actionButtonIcon?: keyof typeof iconMap;
    dataStatus?: string;
    dataStage?: string;
    assigneeRole?: 'scanner' | 'indexer' | 'qc';
  }
}

const iconMap: { [key: string]: LucideIcon } = {
    Check,
    ScanLine,
    FileText,
    FileCog,
    Play,
    Send,
    FileCheck2,
    PlayCircle,
    UserPlus,
    Archive,
    Undo2,
};

export const WORKFLOW_SEQUENCE = [
  "pending-shipment", "reception", "to-scan", "scanning-started", "storage", 
  "to-indexing", "indexing-started", "to-checking", "checking-started",
  "ready-for-processing", "in-processing", "processed", 
  "final-quality-control", "delivery", "pending-deliveries",
  "client-rejections", "corrected", "finalized", "archive"
];

export const WORKFLOW_STAGE_GROUPS = [
  {
    name: "Intake & Scanning",
    stages: ["pending-shipment", "reception", "to-scan", "scanning-started", "storage"],
  },
  {
    name: "Indexing & QC",
    stages: ["to-indexing", "indexing-started", "to-checking", "checking-started"],
  },
  {
    name: "Automated Processing",
    stages: ["ready-for-processing", "in-processing", "processed"],
  },
  {
    name: "Delivery & Finalization",
    stages: ["final-quality-control", "delivery", "pending-deliveries", "finalized", "archive"],
  },
  {
    name: "Correction Loop",
    stages: ["client-rejections", "corrected"],
  },
];


export const STAGE_CONFIG: StageConfig = {
  'pending-shipment': {
    title: "Pending Shipment",
    description: "Books that have been created but are not yet in transit from the client.",
    emptyStateText: "No books are currently pending shipment.",
    dataType: 'book',
    dataStatus: 'Pending',
    viewType: 'list',
  },
  'reception': {
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
  'storage': {
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
    dataStatus: 'Ready for Processing',
    viewType: 'list',
  },
  'in-processing': {
    title: "In Processing",
    description: "Monitoring documents currently being processed by automated scripts.",
    emptyStateText: "No documents are currently being processed.",
    dataStage: "In Processing",
    viewType: 'processing',
    dataType: 'document'
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
    actionButtonIcon: "Check",
    emptyStateText: "No documents for final QC.",
    dataType: 'document',
    dataStage: "Final Quality Control",
    viewType: 'folder',
  },
  'delivery': {
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
    viewType: 'correction',
    dataType: 'book',
  },
  'corrected': {
    title: "Corrected Books",
    description: "Books that have been corrected and are ready to be re-submitted to the workflow.",
    emptyStateText: "There are no corrected books.",
    dataType: 'document',
    dataStage: 'Corrected',
    viewType: 'folder'
  }
};
