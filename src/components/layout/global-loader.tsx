
"use client";

import { useAppContext } from "@/context/workflow-context";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function GlobalLoader() {
  const { progressMutation, progress, isMutating } = useAppContext();

    if (!isMutating && !progressMutation) {
      return null;
    }

    return (
      <div className="fixed bottom-4 right-4 z-50 w-[280px]">
        <div className="flex flex-col gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progressMutation ? (
              <span>Processando... {progress}%</span>
            ) : (
              <span>Processando...</span>
            )}
          </div>

          {progressMutation && (
            <Progress value={progress} className="h-2" />
          )}
        </div>
      </div>
    );
  
}
