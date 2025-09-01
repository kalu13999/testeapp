
import FolderViewClient from "../workflow/folder-view-client";

export default function ArchivePage() {
  const config = {
    title: "Documentos Arquivados",
    description: "Documentos em armazenamento de longo prazo.",
    actionButtonLabel: "", // Sem ação
    actionButtonIcon: "Archive", 
    emptyStateText: "Ainda não há documentos arquivados.",
    dataStatus: "Archived",
    dataType: "book",
    viewType: "folder",
  } as const;
  
  return <FolderViewClient config={config} stage="archive" />;
}

