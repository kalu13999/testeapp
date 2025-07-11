
import FolderViewClient from "../workflow/folder-view-client";

export default function PendingDeliveriesPage() {
  const config = {
    title: "Pending Deliveries",
    description: "Documents awaiting your review and approval.",
    actionButtonLabel: "", // Actions are handled by the component
    actionButtonIcon: "ThumbsUp",
    emptyStateText: "There are no pending deliveries.",
    dataStatus: "Pending Validation",
    viewType: "folder",
  };
  
  return <FolderViewClient config={config} stage="pending-deliveries" />;
}

