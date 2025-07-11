
import FolderViewClient from "../workflow/folder-view-client";

export default function ArchivePage() {
  const config = {
    title: "Archived Documents",
    description: "Documents that are in long-term storage.",
    actionButtonLabel: "", // No action
    actionButtonIcon: "Archive",
    emptyStateText: "No documents have been archived yet.",
    dataStatus: "Archived",
    dataType: "book",
    viewType: "folder",
  };
  
  return <FolderViewClient config={config} stage="archive" />;
}

