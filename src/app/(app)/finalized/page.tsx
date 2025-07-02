
import FolderViewClient from "../workflow/folder-view-client";

export default function FinalizedPage() {
  const config = {
    title: "Finalized Documents",
    description: "Documents that have completed the client validation phase and are ready for archival.",
    actionButtonLabel: "Archive",
    actionButtonIcon: "Archive",
    emptyStateText: "No documents are currently finalized.",
    dataStage: "Finalized",
    viewType: "folder",
  };
  
  return <FolderViewClient config={config} stage="finalized" />;
}
