
"use client"

import * as React from 'react';
import type { BookWithProject, Document } from '@/lib/data';

// This map defines the status transition for books
const bookStatusTransition: { [key: string]: string } = {
  'Pending': 'Received',
  'Received': 'Scanned',
  // In a real app, 'Scanned' would trigger document creation and move them to 'Indexing'
};

// This map defines the status transition for documents
const docStatusTransition: { [key:string]: string } = {
    'Indexing': 'Processing',
    'Processing': 'Quality Control',
    'Delivery': 'Finalized',
}

type WorkflowContextType = {
  books: BookWithProject[];
  documents: (Document & { client: string; status: string })[];
  updateBookStatus: (bookId: string, newStatusName: string) => void;
  updateDocumentStatus: (docId: string, newStatusName: string) => void;
  handleBookAction: (bookId: string, currentStatus: string) => void;
  handleDocumentAction: (docId: string, currentStatus: string) => void;
};

const WorkflowContext = React.createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({
  initialBooks,
  initialDocuments,
  children,
}: {
  initialBooks: BookWithProject[];
  initialDocuments: (Document & { client: string; status: string })[];
  children: React.ReactNode;
}) {
  const [books, setBooks] = React.useState<BookWithProject[]>(initialBooks);
  const [documents, setDocuments] = React.useState<(Document & { client: string; status: string })[]>(initialDocuments);

  const updateBookStatus = (bookId: string, newStatusName: string) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: newStatusName } : book
      )
    );
  };
  
  const handleBookAction = (bookId: string, currentStatus: string) => {
      const nextStatus = bookStatusTransition[currentStatus];
      if(nextStatus) {
          updateBookStatus(bookId, nextStatus);
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
      const nextStatus = docStatusTransition[currentStatus];
      if(nextStatus) {
          updateDocumentStatus(docId, nextStatus);
      }
  };


  const value = { books, documents, updateBookStatus, updateDocumentStatus, handleBookAction, handleDocumentAction };

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
