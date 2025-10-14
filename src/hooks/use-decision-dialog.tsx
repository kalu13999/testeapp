"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Decision = "create" | "revert";

export function useDecisionDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [resolveFn, setResolveFn] = useState<((d: Decision) => void) | null>(null);

  const openDecision = (t: string, desc: string) => {
    setTitle(t);
    setDescription(desc);
    setOpen(true);
    return new Promise<Decision>((resolve) => {
      setResolveFn(() => resolve);
    });
  };

  const handleCreate = () => {
    setOpen(false);
    resolveFn?.("create");
  };
  const handleRevert = () => {
    setOpen(false);
    resolveFn?.("revert");
  };

  const DecisionDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Botão revert (secundário) */}
          <button
            onClick={handleRevert}
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none"
          >
            Reverter movimentos
          </button>

          {/* Espaço */}
          <div style={{ width: 8 }} />

          {/* Botão criar lote (primário) */}
          <AlertDialogAction asChild>
            <button
              onClick={handleCreate}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:opacity-95"
            >
              Criar lote com os movidos
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { openDecision, DecisionDialog };
}