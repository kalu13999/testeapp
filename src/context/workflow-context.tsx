
"use client"

import * as React from 'react';
import type { BookWithProject, Document, AuditLog } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

// This map defines the status transition for books (physical items)
const bookStatusTransition: { [key: string]: string } = {
  'Pending': 'Received',
  'Received': 'Scanned',
};

// This map defines the status transition for entire books of documents (digital items)
const digitalStageTransitions: { [key: string]: string } = {
    'Storage': 'Indexing',
    'Indexing': 'Processing',
    'Processing': 'Quality Control',
    'Quality Control': 'Delivery',
    'Delivery': 'Pending Validation',
}

// Add rejectionReason to our extended Book type for client-side state
type ClientBook = BookWithProject & { rejectionReason?: string | null };

type WorkflowContextType = {
  books: ClientBook[];
  documents: (Document & { client: string; status: string; name: string })[];
  auditLogs: (AuditLog & { user: string; })[];
  handleBookAction: (bookId: string, currentStatus: string) => void;
  handleMoveBookToNextStage: (bookId: string, currentStage: string) => void;
  handleClientAction: (bookId: string, action: 'approve' | 'reject', reason?: string) => void;
  handleFinalize: (bookId: string) => void;
  handleMarkAsCorrected: (bookId: string) => void;
  handleResubmit: (bookId: string, targetStage: string) => void;
  addPageToBook: (bookId: string) => void;
  deletePageFromBook: (pageId: string, bookId: string) => void;
  updateDocumentStatus: (docId: string, newStatus: string) => void;
};

const WorkflowContext = React.createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({
  initialBooks,
  initialDocuments,
  initialAuditLogs,
  children,
}: {
  initialBooks: BookWithProject[];
  initialDocuments: (Document & { client: string; status: string; name: string })[];
  initialAuditLogs: (AuditLog & { user:string; })[];
  children: React.ReactNode;
}) {
  const [books, setBooks] = React.useState<ClientBook[]>(initialBooks);
  const [documents, setDocuments] = React.useState<(Document & { client: string; status: string; name: string })[]>(initialDocuments);
  const [auditLogs, setAuditLogs] = React.useState<(AuditLog & { user: string; })[]>(initialAuditLogs);
  const { toast } = useToast();

  const updateBookStatus = (bookId: string, newStatusName: string, updateFn?: (book: ClientBook) => Partial<ClientBook>) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: newStatusName, ...(updateFn ? updateFn(book) : {}) } : book
      )
    );
  };
  
  const handleBookAction = (bookId: string, currentStatus: string) => {
    const nextStatus = bookStatusTransition[currentStatus];
    if (nextStatus) {
      updateBookStatus(bookId, nextStatus);
      toast({
        title: "Book Status Updated",
        description: `Book moved to "${nextStatus}".`
      });

      if (nextStatus === 'Scanned') {
        const book = books.find(b => b.id === bookId);
        if (!book) return;

        const existingDocs = documents.some(d => d.bookId === book.id);
        if (existingDocs) return;

        const newDocs = Array.from({ length: book.expectedDocuments }).map((_, i) => ({
          id: `doc_${book.id}_${i + 1}`,
          name: `${book.name} - Page ${i + 1}`,
          clientId: book.clientId,
          client: book.clientName,
          status: 'Storage',
          statusId: 'ds_4',
          type: 'Scanned Page',
          lastUpdated: new Date().toISOString().slice(0, 10),
          tags: [],
          folderId: null,
          projectId: book.projectId,
          bookId: book.id,
        }));

        setDocuments(prevDocs => [...prevDocs, ...newDocs]);
        toast({
          title: "Scanning Complete",
          description: `${book.expectedDocuments} digital pages created in Storage.`
        });
      }
    }
  };
  
  const moveBookDocuments = (bookId: string, newStatus: string) => {
    setDocuments(prevDocs =>
        prevDocs.map(doc =>
            doc.bookId === bookId ? { ...doc, status: newStatus } : doc
        )
    );
  };

  const handleMoveBookToNextStage = (bookId: string, currentStage: string) => {
    const nextStage = digitalStageTransitions[currentStage];
    if (!nextStage) return;

    moveBookDocuments(bookId, nextStage);
    toast({ title: "Workflow Action", description: `Book moved to ${nextStage}.` });
  };

  const handleClientAction = (bookId: string, action: 'approve' | 'reject', reason?: string) => {
    const isApproval = action === 'approve';
    const newStatus = isApproval ? 'Finalized' : 'Client Rejected';
    const book = books.find(b => b.id === bookId);
    moveBookDocuments(bookId, newStatus);
    
    // Update the book's state, including the rejection reason if provided
    updateBookStatus(bookId, newStatus, (b) => ({
        rejectionReason: isApproval ? null : reason
    }));

    toast({
      title: `Book ${isApproval ? 'Approved' : 'Rejected'}`,
      description: `"${book?.name}" has been ${isApproval ? 'approved by the client' : 'rejected and sent for review'}.`,
    });
  };

  const handleFinalize = (bookId: string) => {
    moveBookDocuments(bookId, 'Archived');
    toast({ title: "Book Archived", description: "The book has been moved to long-term storage." });
  };
  
  const handleMarkAsCorrected = (bookId: string) => {
    moveBookDocuments(bookId, 'Corrected');
    updateBookStatus(bookId, 'Corrected'); // Also update book status
    toast({ title: "Book Corrected", description: "The book is now ready for resubmission." });
  };

  const handleResubmit = (bookId: string, targetStage: string) => {
    moveBookDocuments(bookId, targetStage);
    updateBookStatus(bookId, 'In Progress'); // Reset book status
    toast({ title: "Book Resubmitted", description: `The book has been sent back to ${targetStage}.` });
  };
  
  const addPageToBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const newPageNumber = documents.filter(d => d.bookId === bookId).length + 1;
    const newPage = {
      id: `doc_${book.id}_new_${newPageNumber}`,
      name: `${book.name} - Page ${newPageNumber} (Added)`,
      clientId: book.clientId,
      client: book.clientName,
      status: 'Client Rejected', // Stays in the same stage
      statusId: 'ds_13',
      type: 'Added Page',
      lastUpdated: new Date().toISOString().slice(0, 10),
      tags: ['added'],
      folderId: null,
      projectId: book.projectId,
      bookId: book.id,
    };
    setDocuments(prev => [...prev, newPage]);
    setBooks(prev => prev.map(b => b.id === bookId ? {...b, documentCount: b.documentCount + 1 } : b));
  }

  const deletePageFromBook = (pageId: string, bookId: string) => {
    setDocuments(prev => prev.filter(p => p.id !== pageId));
    setBooks(prev => prev.map(b => b.id === bookId ? {...b, documentCount: b.documentCount - 1 } : b));
  }

  const updateDocumentStatus = (docId: string, newStatus: string) => {
    setDocuments(prevDocs =>
        prevDocs.map(doc =>
            doc.id === docId ? { ...doc, status: newStatus } : doc
        )
    );
  };


  const value = { 
    books, 
    documents, 
    auditLogs, 
    handleBookAction, 
    handleMoveBookToNextStage,
    handleClientAction,
    handleFinalize,
    handleMarkAsCorrected,
    handleResubmit,
    addPageToBook,
    deletePageFromBook,
    updateDocumentStatus,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = React.useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
