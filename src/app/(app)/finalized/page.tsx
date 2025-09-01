
import FolderViewClient from "../workflow/folder-view-client";

export default function FinalizedPage() {
  const config = {
    title: "Documentos Finalizados",
    description: "Documentos que completaram a fase de validação pelo cliente e estão prontos para arquivamento.",
    actionButtonLabel: "Arquivar",
    actionButtonIcon: "Archive",
    emptyStateText: "Não há documentos finalizados no momento.",
    dataStatus: "Finalized",
    dataType: "book",
    viewType: "folder",
  } as const;
  
  return <FolderViewClient config={config} stage="finalized" />;
}
