
"use client"

import * as React from 'react';
import type { BookWithProject, Document, AuditLog } from '@/lib/data';

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
    'Quality Control': 'Delivery', // Represents bulk approval
    'Delivery': 'Finalized',
}

type WorkflowContextType = {
  books: BookWithProject[];
  documents: (Document & { client: string; status: string; name: string })[];
  auditLogs: (AuditLog & { user: string; })[];
  updateBookStatus: (bookId: string, newStatusName: string) => void;
  updateDocumentStatus: (docId: string, newStatusName: string) => void;
  handleBookAction: (bookId: string, currentStatus: string) => void;
  handleDocumentAction: (docId: string, currentStatus: string) => void;
  handleMoveBookToNextStage: (bookId: string, currentStage: string) => void;
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
  const [books, setBooks] = React.useState<BookWithProject[]>(initialBooks);
  const [documents, setDocuments] = React.useState<(Document & { client: string; status: string; name: string })[]>(initialDocuments);
  const [auditLogs, setAuditLogs] = React.useState<(AuditLog & { user: string; })[]>(initialAuditLogs);

  const updateBookStatus = (bookId: string, newStatusName: string) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: newStatusName } : book
      )
    );
  };
  
  const handleBookAction = (bookId: string, currentStatus: string) => {
    const nextStatus = bookStatusTransition[currentStatus];
    if (nextStatus) {
      updateBookStatus(bookId, nextStatus);

      // If the book is now 'Scanned', create its digital documents in 'Storage'.
      if (nextStatus === 'Scanned') {
        const book = books.find(b => b.id === bookId);
        if (!book) return;

        // Avoid creating duplicate documents
        const existingDocs = documents.filter(d => d.bookId === book.id);
        if (existingDocs.length > 0) return;

        const newDocs = Array.from({ length: book.expectedDocuments }).map((_, i) => ({
          id: `doc_${book.id}_${i + 1}`,
          name: `${book.name} - Page ${i + 1}`,
          clientId: book.clientId,
          client: book.clientName,
          status: 'Storage', // Initial digital status
          statusId: 'ds_4', // ID for 'Storage'
          type: 'Scanned Page',
          lastUpdated: new Date().toISOString().slice(0, 10),
          tags: [],
          folderId: null,
          projectId: book.projectId,
          bookId: book.id,
        }));

        setDocuments(prevDocs => [...prevDocs, ...newDocs]);
      }
    }
  };

  const updateDocumentStatus = (docId: string, newStatusName: string) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc =>
        doc.id === docId ? { ...doc, status: newStatusName } : doc
      )
    );
  };
  
  const handleDocumentAction = (docId: string, currentStatus: string) => {
      const nextStatus = digitalStageTransitions[currentStatus];
      if(nextStatus) {
          updateDocumentStatus(docId, nextStatus);
      }
  };

  const handleMoveBookToNextStage = (bookId: string, currentStage: string) => {
    const nextStage = digitalStageTransitions[currentStage];
    if (!nextStage) {
        console.warn(`No transition defined for stage: ${currentStage}`);
        return;
    }

    setDocuments(prevDocs =>
        prevDocs.map(doc =>
            (doc.bookId === bookId && doc.status === currentStage)
                ? { ...doc, status: nextStage }
                : doc
        )
    );
  };


  const value = { books, documents, auditLogs, updateBookStatus, updateDocumentStatus, handleBookAction, handleDocumentAction, handleMoveBookToNextStage };

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
