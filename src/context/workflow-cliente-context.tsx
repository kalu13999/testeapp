
/*"use client"

import React from 'react';
import { useAppContext } from './workflow-context';
import { useToast } from "@/hooks/use-toast";
import type { RawBook } from '@/lib/data';
import * as dataApi from '@/lib/data';

type ClientValidationContextType = {
  handleValidationDeliveryBatch: (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => Promise<void>;
};

const ClientValidationContext = React.createContext<ClientValidationContextType | undefined>(undefined);

export function ClientValidationProvider({ children }: { children: React.ReactNode }) {
  const appContext = useAppContext();
  const { toast } = useToast();

  const withMutation = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    appContext.setIsMutating(true);
    try {
        const result = await action();
        return result;
    } catch (error: any) {
        console.error("A validation action failed:", error);
        toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } finally {
        appContext.setIsMutating(false);
    }
  };

  const handleValidationDeliveryBatch = async (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => {
    await withMutation(async () => {
        if (!appContext.currentUser) return;
        
        const batch = appContext.deliveryBatches.find(b => b.id === deliveryId);
        if (!batch) return;
        
        const itemsInBatch = appContext.deliveryBatchItems.filter(item => item.deliveryId === deliveryId);
        const failedMoves: string[] = [];

        for (const item of itemsInBatch) {
            const book = appContext.rawBooks.find(b => b.id === item.bookId);
            if (!book) continue;

            const currentStatusName = appContext.statuses.find(s => s.id === book.statusId)?.name;
            if (!currentStatusName) {
                console.error(`Could not find status name for statusId: ${book.statusId}`);
                failedMoves.push(book.name);
                continue;
            }
            
            let newStatusName: string;
            
            if (finalDecision === 'reject_all') {
                newStatusName = 'Client Rejected';
            } else { // approve_remaining
                newStatusName = item.status === 'rejected' ? 'Client Rejected' : 'Finalized';
            }
            
            if (currentStatusName !== newStatusName) {
                const moveResult = await appContext.moveBookFolder(book.name, currentStatusName, newStatusName);
                if(moveResult) {
                    const updatedBook = await appContext.updateBookStatus(book.id, newStatusName);
                    appContext.setRawBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));
                    await appContext.logAction(
                        newStatusName === 'Client Rejected' ? 'Client Rejection' : 'Client Approval',
                        `Batch Finalization: Book status set to ${newStatusName}.`,
                        { bookId: book.id, userId: appContext.currentUser.id }
                    );
                } else {
                    failedMoves.push(book.name);
                }
            }
        }

        if (failedMoves.length > 0) {
            toast({title: "Batch Finalization Failed", description: `Could not move folders for the following books: ${failedMoves.join(', ')}. The batch status was not updated.`, variant: "destructive", duration: 5000});
            return;
        }

        const response = await fetch(`/api/delivery-batches/${deliveryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Finalized' }),
        });
        if (!response.ok) throw new Error('Failed to finalize batch via API.');
        
        const updatedBatch = await response.json();
        appContext.setDeliveryBatches(prev => prev.map(b => b.id === deliveryId ? updatedBatch : b));

        await appContext.logAction('Delivery Batch Finalized', `Batch ${deliveryId} was finalized by ${appContext.currentUser.name}. Decision: ${finalDecision}.`, { userId: appContext.currentUser.id });
        toast({ title: "Validation Confirmed", description: "All books in the batch have been processed." });
    });
  };
  
  const value = {
      handleValidationDeliveryBatch,
  };

  return (
    <ClientValidationContext.Provider value={value}>
      {children}
    </ClientValidationContext.Provider>
  );
}

export function useClientValidationContext() {
  const context = React.useContext(ClientValidationContext);
  if (context === undefined) {
    throw new Error('useClientValidationContext must be used within a ClientValidationProvider');
  }
  return context;
}
*/