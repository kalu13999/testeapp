
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";
import CorrectionViewClient from "../correction-view-client";
import ProcessingViewClient from "../processing-view-client";
import { STAGE_CONFIG } from "@/lib/workflow-config";

type Props = {
  params: { stage: string };
};

export default async function WorkflowStagePage({ params }: Props) {
  // This forces the resolution of `params` and avoids the Next.js warning.
  await Promise.resolve();

  const { stage } = params;
  const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG];
  if (!config) {
      notFound();
  }
  
  if (config.viewType === 'folder') {
    return <FolderViewClient config={config} stage={stage} />;
  }
  
  if (config.viewType === 'correction') {
    return <CorrectionViewClient config={config} stage={stage} />;
  }

  if (config.viewType === 'processing') {
    return <ProcessingViewClient config={config} stage={stage} />;
  }
  
  return <WorkflowClient config={config} stage={stage} />;
}

