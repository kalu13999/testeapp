

import { LucideIcon } from "lucide-react";

type StageConfigItem = {
  title: string;
  description: string;
  viewType: 'list' | 'folder' | 'correction' | 'processing';
  emptyStateText: string;
  dataType: 'book' | 'document';
  actionButtonLabel?: string;
  actionButtonIcon?: string;
  dataStatus?: string;
  assigneeRole?: 'scanner' | 'indexer' | 'qc';
};

type StageConfig = {
  [key: string]: StageConfigItem;
}

export const MANDATORY_STAGES = [
  "pending-shipment", "confirm-reception", "already-received", "storage",
  "delivery", "client-rejections", "corrected",
  "finalized", "archive"
];

export const WORKFLOW_PHASES = [
  {
    id: 'intake',
    name: "Intake & Reception",
    toggleable: false,
    description: "Initial stages for receiving books.",
    stages: ["pending-shipment", "confirm-reception", "already-received"],
    config: {
      'pending-shipment': {
        title: "Pending Shipment",
        description: "Books that have been created but are not yet in transit from the client.",
        emptyStateText: "No books are currently pending shipment.",
        dataType: 'book',
        dataStatus: 'Pending Shipment',
        viewType: 'list',
      },
      'confirm-reception': {
        title: "Confirm Reception",
        description: "Books marked as shipped by the client. Confirm their physical arrival.",
        actionButtonLabel: "Confirm Arrival",
        actionButtonIcon: "Check",
        emptyStateText: "No books are currently in transit from clients.",
        dataType: 'book',
        dataStatus: 'In Transit',
        viewType: 'list',
      },
      'already-received': {
        title: "Already Received",
        description: "Books that have been received. Assign to a scanner or send directly to storage if scanning is disabled.",
        emptyStateText: "No received books are awaiting processing.",
        dataType: 'book',
        dataStatus: 'Received',
        viewType: 'list',
      },
    }
  },
  {
    id: 'scanning',
    name: "Scanning",
    toggleable: true,
    description: "Digitization of physical books into image files.",
    stages: ["to-scan", "scanning-started"],
    config: {
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
    }
  },
  {
    id: 'storage',
    name: "Storage",
    toggleable: false,
    description: "The entry point for the digital workflow.",
    stages: ["storage"],
    config: {
      'storage': {
        title: "Storage",
        description: "Scanned documents are organized by book. Assign books to an indexer.",
        actionButtonLabel: "Assign for Indexing",
        actionButtonIcon: "UserPlus",
        emptyStateText: "No scanned documents are waiting in storage.",
        dataStatus: 'Storage',
        viewType: 'folder',
        dataType: 'book',
        assigneeRole: 'indexer',
      },
    }
  },
  {
    id: 'indexing',
    name: "Indexing",
    toggleable: true,
    description: "Manual or automated data entry and metadata tagging.",
    stages: ["to-indexing", "indexing-started"],
    config: {
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
    }
  },
  {
    id: 'checking',
    name: "Initial Quality Control",
    toggleable: true,
    description: "Initial check for scan quality and completeness.",
    stages: ["to-checking", "checking-started"],
    config: {
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
    }
  },
  {
    id: 'processing',
    name: "Automated Processing",
    toggleable: true,
    description: "Automated OCR, data extraction, and other scripts.",
    stages: ["ready-for-processing", "in-processing", "processed"],
    config: {
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
        dataStatus: "In Processing",
        viewType: 'processing',
        dataType: 'book'
      },
      'processed': {
        title: "Processed",
        description: "Documents that have completed automated processing and are ready for final review.",
        actionButtonLabel: "Send to Final QC",
        actionButtonIcon: "Send",
        emptyStateText: "No documents have been processed.",
        dataType: 'book',
        dataStatus: "Processed",
        viewType: 'folder',
      },
    }
  },
  {
    id: 'final_qc',
    name: "Final Quality Control",
    toggleable: true,
    description: "Final review before sending to the client.",
    stages: ["final-quality-control"],
    config: {
      'final-quality-control': {
        title: "Final Quality Control",
        description: "Review documents for quality and accuracy before delivery.",
        actionButtonLabel: "Approve for Delivery",
        actionButtonIcon: "Check",
        emptyStateText: "No documents for final QC.",
        dataType: 'book',
        dataStatus: "Final Quality Control",
        viewType: 'folder',
      },
    }
  },
  {
    id: 'delivery_loop',
    name: "Delivery & Correction",
    toggleable: false,
    description: "Stages involving client interaction and feedback.",
    stages: ["delivery", "pending-deliveries", "client-rejections", "corrected"],
    config: {
      'delivery': {
        title: "Delivery",
        description: "Documents approved and ready for delivery to the client.",
        actionButtonLabel: "Send to Client",
        actionButtonIcon: "Send",
        emptyStateText: "No documents to deliver.",
        dataType: 'book',
        dataStatus: "Delivery",
        viewType: 'folder',
      },
      'pending-deliveries': {
        title: "Pending Deliveries",
        description: "Documents awaiting your review and approval.",
        actionButtonLabel: "",
        actionButtonIcon: "ThumbsUp",
        emptyStateText: "There are no pending deliveries.",
        dataStatus: "Pending Validation",
        viewType: "folder",
        dataType: 'book'
      },
      'client-rejections': {
        title: "Client Rejections",
        description: "Books that have been rejected by the client and require correction.",
        actionButtonLabel: "Mark as Corrected",
        actionButtonIcon: "Undo2",
        emptyStateText: "No books have been rejected by clients.",
        dataStatus: 'Client Rejected',
        viewType: 'correction',
        dataType: 'book',
      },
      'corrected': {
        title: "Corrected Books",
        description: "Books that have been corrected and are ready to be re-submitted to the workflow.",
        emptyStateText: "There are no corrected books.",
        dataType: 'book',
        dataStatus: 'Corrected',
        viewType: 'folder'
      }
    }
  },
  {
    id: 'finalization',
    name: "Finalization",
    toggleable: false,
    description: "Final archival stages.",
    stages: ["finalized", "archive"],
    config: {
      'finalized': {
        title: "Finalized Documents",
        description: "Documents that have completed the client validation phase and are ready for archival.",
        actionButtonLabel: "Archive",
        actionButtonIcon: "Archive",
        emptyStateText: "No documents are currently finalized.",
        dataStatus: "Finalized",
        viewType: "folder",
        dataType: 'book'
      },
      'archive': {
        title: "Archived Documents",
        description: "Documents that are in long-term storage.",
        actionButtonLabel: "", // No action
        actionButtonIcon: "Archive",
        emptyStateText: "No documents have been archived yet.",
        dataStatus: "Archived",
        viewType: "folder",
        dataType: 'book'
      }
    }
  }
];

export const WORKFLOW_SEQUENCE: string[] = WORKFLOW_PHASES.flatMap(group => group.stages);

export const STAGE_CONFIG: StageConfig = WORKFLOW_PHASES.reduce((acc, group) => {
  return { ...acc, ...group.config };
}, {});


export const findStageKeyFromStatus = (statusName: string): string | undefined => {
    for (const stageKey in STAGE_CONFIG) {
        const config = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG];
        if (config.dataStatus === statusName) {
            return stageKey;
        }
    }
    return undefined;
};

export const getNextEnabledStage = (currentStage: string, workflow: string[]): string | null => {
    const currentIndex = WORKFLOW_SEQUENCE.indexOf(currentStage);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < WORKFLOW_SEQUENCE.length; i++) {
        const nextStageKey = WORKFLOW_SEQUENCE[i];
        if (workflow.includes(nextStageKey)) return nextStageKey;
    }
    return null;
};
