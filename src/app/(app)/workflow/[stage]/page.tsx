import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";
import CorrectionViewClient from "../correction-view-client";
import ProcessingViewClient from "../processing-view-client";
import { STAGE_CONFIG } from "@/lib/workflow-config";


export default async function WorkflowStagePage(props: any) {
  // ✅ Aqui resolvemos o `params` antes de usá-lo
  const { stage } = await props.params;

  const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG];
  if (!config) notFound();

  switch (config.viewType) {
    case "folder":
      return <FolderViewClient config={config} stage={stage} />;
    case "correction":
      return <CorrectionViewClient config={config} stage={stage} />;
    case "processing":
      return <ProcessingViewClient config={config} stage={stage} />;
    default:
      return <WorkflowClient config={config} stage={stage} />;
  }
}
