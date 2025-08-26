
import * as React from 'react';
import { useToast } from "@/hooks/use-toast";
import type { AppDocument, EnrichedBook, RejectionTag, User } from '@/lib/data';
import { STAGE_CONFIG, findStageKeyFromStatus, getNextEnabledStage } from '@/lib/workflow-config';

type SharedState = {
  currentUser: User | null;
  users: User[];
  rawBooks: EnrichedBook[];
  rejectionTags: RejectionTag[];
  projectWorkflows: { [key: string]: string[] };
  statuses: { id: string; name: string }[];
  deliveryBatchItems: { id: string; deliveryId: string; bookId: string; status: string; }[];
  setRawBooks: React.Dispatch<React.SetStateAction<EnrichedBook[]>>;
  setDeliveryBatchItems: React.Dispatch<React.SetStateAction<{ id: string; deliveryId: string; bookId: string; status: string; }[]>>;
  updateBookStatus: (bookId: string, newStatusName: string, additionalUpdates?: Partial<EnrichedBook>) => Promise<any>;
  updateBook: (bookId: string, bookData: Partial<Omit<EnrichedBook, 'id' | 'projectId' | 'statusId'>>) => Promise<void>;
  updateDocument: (docId: string, data: Partial<AppDocument>) => Promise<void>;
  logAction: (action: string, details: string, ids: { bookId?: string; documentId?: string; userId?: string; }) => Promise<void>;
};

export const useDeliveryActions = (sharedState: SharedState) => {
  const { 
    currentUser, rawBooks, rejectionTags,
    setRawBooks, setDeliveryBatchItems, updateBookStatus, 
    updateBook, updateDocument, logAction 
  } = sharedState;
  const { toast } = useToast();

  const handleClientAction = async (bookId: string, action: 'approve' | 'reject', reason?: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;

    if (action === 'reject') {
      const updatedBook = await updateBookStatus(bookId, 'Client Rejected', { rejectionReason: reason });
      setRawBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updatedBook } : b));
      logAction('Client Rejection', `Book "${book.name}" rejected. Reason: ${reason}`, { bookId });
      toast({ title: `Book "${book.name}" Rejected`, variant: "destructive" });
    } else { // approve
      if (book.rejectionReason) {
        await updateBook(bookId, { rejectionReason: null });
      }
      const updatedBook = await updateBookStatus(bookId, 'Finalized');
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Client Approval', `Book "${book.name}" approved by client.`, { bookId });
      toast({ title: `Book "${book.name}" Approved` });
    }
  };

  const tagPageForRejection = async (pageId: string, tags: string[]) => {
      await updateDocument(pageId, { tags });
      const doc = sharedState.documents.find(d => d.id === pageId);
      if(doc) {
        logAction('Page Tagged', `Page "${doc.name}" tagged for rejection with: ${tags.join(', ') || 'None'}.`, { documentId: pageId, bookId: doc.bookId });
      }
  };
  
  const setProvisionalDeliveryStatus = async (deliveryItemId: string, bookId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/delivery-batch-items/${deliveryItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status, user_id: currentUser.id })
        });
        if (!response.ok) throw new Error('Failed to update delivery item status.');
        
        const updatedItem = await response.json();
        setDeliveryBatchItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        
        if (status === 'rejected') {
          await updateBook(bookId, { rejectionReason: reason });
          logAction('Rejection Marked', `Book "${rawBooks.find(b => b.id === bookId)?.name}" marked as rejected. Reason: ${reason}`, { bookId });
        } else if (status === 'approved') {
          const book = rawBooks.find(b => b.id === bookId);
          if (book?.rejectionReason) {
            await updateBook(bookId, { rejectionReason: null });
          }
           logAction('Approval Marked', `Book "${book?.name}" marked as approved by client.`, { bookId });
        }
        
        toast({ title: `Book validation status set to: ${status}` });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
  };

  return {
    handleClientAction,
    tagPageForRejection,
    setProvisionalDeliveryStatus
  };
};
