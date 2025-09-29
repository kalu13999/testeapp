
"use client";

import { useAuth } from "@/context/auth-context";
import { useAppContext } from "@/context/workflow-context";
import { Loader2 } from "lucide-react";

// A custom hook to safely access useAppContext
const useSafeAppContext = () => {
  try {
    return useAppContext();
  } catch (e) {
    // This will happen on pages outside the AppProvider, like the login page.
    return { isMutating: false, isPageLoading: false };
  }
};


export function GlobalLoader() {
  const { isMutating, isPageLoading } = useSafeAppContext();
  const { isAuthLoading } = useAuth();

  const showLoader = isMutating || isPageLoading || isAuthLoading;

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
