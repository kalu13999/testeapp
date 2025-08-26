
"use client"

import React from 'react';
import { useAppContext } from './workflow-context';
import { useToast } from "@/hooks/use-toast";
import * as dataApi from '@/lib/data';

type ClientValidationContextType = {
  handleValidationDeliveryBatch: (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => Promise<void>;
};

const ClientValidationContext = React.createContext<ClientValidationContextType | undefined>(undefined);

export function ClientValidationProvider({ children }: { children: React.ReactNode }) {
  const appContext = useAppContext();
  const { toast } = useToast();

  const handleValidationDeliveryBatch = async (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => {
    if (!appContext.currentUser) return;
    
    const batch = appContext.deliveryBatches.find(b => b.id === deliveryId);
    if (!batch) return;

    const itemsInBatch = appContext.deliveryBatchItems.filter(item => item.deliveryId === deliveryId);
    const failedMoves: string[] = [];

    appContext.setIsMutating(true);
    try {
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
                if (moveResult) {
                    await appContext.updateBookStatus(book.id, newStatusName);
                    await appContext.logAction(
                        newStatusName === 'Client Rejected' ? 'Client Rejection' : 'Client Approval',
                        `Book status set to ${newStatusName} during batch finalization.`,
                        { bookId: book.id, userId: appContext.currentUser.id }
                    );
                } else {
                    failedMoves.push(book.name);
                }
            }
        }

        if (failedMoves.length > 0) {
            toast({
                title: "Partial Failure",
                description: `Could not move folders for the following books: ${failedMoves.join(', ')}. The batch was not finalized.`,
                variant: "destructive",
                duration: 10000,
            });
            return;
        }

        // All books moved successfully, now update the batch status
        const response = await fetch(`/api/delivery-batches/${deliveryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Finalized', deliveryDate: new Date().toISOString().slice(0, 19).replace('T', ' ') }),
        });
        if (!response.ok) throw new Error('Failed to finalize batch via API.');
        
        const updatedBatch = await response.json();
        appContext.setDeliveryBatches(prev => prev.map(b => b.id === deliveryId ? updatedBatch : b));

        await appContext.logAction('Delivery Batch Finalized', `Batch ${deliveryId} was finalized by ${appContext.currentUser.name}. Decision: ${finalDecision}.`, { userId: appContext.currentUser.id });
        toast({ title: "Validation Confirmed", description: "All books in the batch have been processed." });
    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        appContext.setIsMutating(false);
    }
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
