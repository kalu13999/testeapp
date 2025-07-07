
import { notFound } from "next/navigation";
import WorkflowClient from "./client";
import FolderViewClient from "../folder-view-client";
import CorrectionViewClient from "../correction-view-client";
import ProcessingViewClient from "../processing-view-client";
import { STAGE_CONFIG } from "@/lib/workflow-config";

export default async function WorkflowStagePage({ params }: { params: { stage: string } }) {
    const config = STAGE_CONFIG[params.stage as keyof typeof STAGE_CONFIG];
    if (!config) {
        notFound();
    }
    
    if (config.viewType === 'folder') {
      return <FolderViewClient config={config} stage={params.stage} />;
    }
    
    if (config.viewType === 'correction') {
      return <CorrectionViewClient config={config} stage={params.stage} />;
    }

    if (config.viewType === 'processing') {
      return <ProcessingViewClient config={config} stage={params.stage} />;
    }
    
    return <WorkflowClient config={config} stage={params.stage} />;
}
