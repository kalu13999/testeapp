
"use client";

import { useAppContext } from "@/context/workflow-context";
import { Loader2 } from "lucide-react";

export function GlobalLoader() {
  const { isMutating, isPageLoading } = useAppContext();

  const showLoader = isMutating || isPageLoading;

  if (!showLoader) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Processing...</span>
      </div>
    </div>
  );
}
