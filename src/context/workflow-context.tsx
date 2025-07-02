
"use client"

import * as React from 'react';
import type { Client, User, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

// Define the shape of the book data when importing
export interface BookImport {
  name: string;
  expectedDocuments: number;
}


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

// Client-side representation of a document
export type AppDocument = RawDocument & { client: string; status: string };

type AppContextType = {
  // State
  clients: Client[];
  users: User[];
  projects: EnrichedProject[];
  books: EnrichedBook[];
  documents: AppDocument[];
  auditLogs: (AuditLog & { user: string; })[];
  
  // Client Actions
  addClient: (clientData: { name: string }) => void;
  updateClient: (clientId: string, clientData: { name: string }) => void;
  deleteClient: (clientId: string) => void;

  // User Actions
  addUser: (userData: { name: string; email: string; role: string }) => void;
  updateUser: (userId: string, userData: { name: string; email: string; role: string }) => void;
  deleteUser: (userId: string) => void;

  // Project Actions
  addProject: (projectData: { name: string; clientId: string }) => void;
  updateProject: (projectId: string, projectData: { name: string; clientId: string }) => void;
  deleteProject: (projectId: string) => void;

  // Book Actions
  addBook: (projectId: string, bookData: { name: string; expectedDocuments: number }) => void;
  updateBook: (bookId: string, bookData: { name: string; expectedDocuments: number }) => void;
  deleteBook: (bookId: string) => void;
  importBooks: (projectId: string, newBooks: BookImport[]) => void;

  // Workflow Actions
  handleBookAction: (bookId: string, currentStatus: string) => void;
  handleMoveBookToNextStage: (bookId: string, currentStage: string) => void;
  handleClientAction: (bookId: string, action: 'approve' | 'reject', reason?: string) => void;
  handleFinalize: (bookId: string) => void;
  handleMarkAsCorrected: (bookId: string) => void;
  handleResubmit: (bookId: string, targetStage: string) => void;
  addPageToBook: (bookId: string, position: number) => void;
  deletePageFromBook: (pageId: string, bookId: string) => void;
  updateDocumentStatus: (docId: string, newStatus: string) => void;
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({
  initialClients,
  initialUsers,
  initialProjects,
  initialBooks,
  initialDocuments,
  initialAuditLogs,
  children,
}: {
  initialClients: Client[];
  initialUsers: User[];
  initialProjects: EnrichedProject[];
  initialBooks: EnrichedBook[];
  initialDocuments: AppDocument[];
  initialAuditLogs: (AuditLog & { user:string; })[];
  children: React.ReactNode;
}) {
  const [clients, setClients] = React.useState<Client[]>(initialClients);
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [projects, setProjects] = React.useState<EnrichedProject[]>(initialProjects);
  const [books, setBooks] = React.useState<EnrichedBook[]>(initialBooks);
  const [documents, setDocuments] = React.useState<AppDocument[]>(initialDocuments);
  const [auditLogs, setAuditLogs] = React.useState<(AuditLog & { user: string; })[]>(initialAuditLogs);
  const { toast } = useToast();
  
  // --- UTILITY FUNCTIONS ---
  const enrichBook = (book: RawBook): EnrichedBook => {
      const project = projects.find(p => p.id === book.projectId);
      const client = clients.find(c => c.id === project?.clientId);
      const bookDocuments = documents.filter(d => d.bookId === book.id);
      const bookProgress = book.expectedDocuments > 0 ? (bookDocuments.length / book.expectedDocuments) * 100 : 0;
      
      return {
          ...book,
          clientId: project?.clientId || 'Unknown',
          projectName: project?.name || 'Unknown Project',
          clientName: client?.name || 'Unknown Client',
          documentCount: bookDocuments.length,
          progress: Math.min(100, bookProgress),
      }
  };

  const enrichProject = (project: { id: string, name: string, clientId: string }): EnrichedProject => {
      const client = clients.find(c => c.id === project.clientId);
      const projectBooks = books.filter(b => b.projectId === project.id);
      const projectDocuments = documents.filter(d => d.projectId === project.id);
      
      const totalExpected = projectBooks.reduce((sum, book) => sum + book.expectedDocuments, 0);
      const progress = totalExpected > 0 ? (projectDocuments.length / totalExpected) * 100 : 0;
      
      const isComplete = projectBooks.length > 0 && projectBooks.every(b => b.status === "Complete");

      return {
          ...project,
          clientName: client?.name || 'Unknown Client',
          documentCount: projectDocuments.length,
          totalExpected,
          progress: Math.min(100, progress),
          status: isComplete ? "Complete" : "In Progress",
          books: projectBooks,
      };
  };

  // --- CRUD ACTIONS ---

  // Clients
  const addClient = (clientData: { name: string }) => {
    const newClient: Client = { id: `cl_${Date.now()}`, ...clientData };
    setClients(prev => [...prev, newClient]);
    toast({ title: "Client Added", description: `Client "${newClient.name}" has been created.` });
  };

  const updateClient = (clientId: string, clientData: { name: string }) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...clientData } : c));
    toast({ title: "Client Updated", description: "Client details have been saved." });
  };

  const deleteClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    // Also delete associated projects and books for data consistency
    const projectsToDelete = projects.filter(p => p.clientId === clientId).map(p => p.id);
    setProjects(prev => prev.filter(p => p.clientId !== clientId));
    setBooks(prev => prev.filter(b => !projectsToDelete.includes(b.projectId)));
    toast({ title: "Client Deleted", description: "Client and all associated projects have been deleted.", variant: "destructive" });
  };
  
  // Users
  const addUser = (userData: { name: string; email: string; role: string }) => {
    const newUser: User = { id: `u_${Date.now()}`, avatar: 'https://placehold.co/100x100.png', ...userData };
    setUsers(prev => [...prev, newUser]);
    toast({ title: "User Added", description: `User "${newUser.name}" has been created.` });
  };

  const updateUser = (userId: string, userData: { name: string; email: string; role: string }) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...userData } : u));
    toast({ title: "User Updated", description: "User details have been saved." });
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "User Deleted", description: "The user has been deleted.", variant: "destructive" });
  };
  
  // Projects
  const addProject = (projectData: { name: string; clientId: string }) => {
    const newProjectData = { id: `proj_${Date.now()}`, ...projectData };
    const newEnrichedProject = enrichProject(newProjectData);
    setProjects(prev => [...prev, newEnrichedProject]);
    toast({ title: "Project Added", description: `Project "${newProjectData.name}" has been created.` });
  };
  
  const updateProject = (projectId: string, projectData: { name: string; clientId: string }) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          const updatedRaw = { ...p, ...projectData };
          return enrichProject(updatedRaw);
      }));
      toast({ title: "Project Updated" });
  };

  const deleteProject = (projectId: string) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setBooks(prev => prev.filter(b => b.projectId !== projectId));
      toast({ title: "Project Deleted", variant: "destructive" });
  };

  // Books
  const addBook = (projectId: string, bookData: { name: string; expectedDocuments: number }) => {
      const newRawBook: RawBook = {
          id: `book_${Date.now()}`,
          status: 'Pending',
          projectId,
          ...bookData,
      };
      const newEnrichedBook = enrichBook(newRawBook);
      setBooks(prev => [...prev, newEnrichedBook]);
      toast({ title: "Book Added", description: `Book "${newRawBook.name}" has been added.` });
  };
  
  const updateBook = (bookId: string, bookData: { name: string; expectedDocuments: number }) => {
      setBooks(prev => prev.map(b => b.id === bookId ? enrichBook({ ...b, ...bookData }) : b));
      toast({ title: "Book Updated" });
  };

  const deleteBook = (bookId: string) => {
      setBooks(prev => prev.filter(b => b.id !== bookId));
      toast({ title: "Book Deleted", variant: "destructive" });
  };

  const importBooks = (projectId: string, newBooks: BookImport[]) => {
    const booksToAdd = newBooks.map((book, i) => {
        const newRawBook: RawBook = {
            id: `book_imp_${Date.now()}_${i}`,
            status: 'Pending',
            projectId,
            ...book
        };
        return enrichBook(newRawBook);
    });
    setBooks(prev => [...prev, ...booksToAdd]);
    toast({
        title: "Import Successful",
        description: `${booksToAdd.length} books have been added to the project.`
    });
  };


  // --- WORKFLOW ACTIONS ---

  const updateBookStatus = (bookId: string, newStatusName: string, updateFn?: (book: EnrichedBook) => Partial<EnrichedBook>) => {
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

        const newDocs: AppDocument[] = Array.from({ length: book.expectedDocuments }).map((_, i) => ({
          id: `doc_${book.id}_${i + 1}`,
          name: `${book.name} - Page ${i + 1}`,
          clientId: book.clientId,
          client: book.clientName,
          status: 'Storage',
          statusId: 'ds_4', // Corresponds to 'Storage'
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
    
    updateBookStatus(bookId, newStatus, (b) => ({
        rejectionReason: isApproval ? null : reason
    }));

    toast({
      title: `Book ${isApproval ? 'Approved' : 'Rejected'}`,
      description: `"${book?.name}" has been ${isApproval ? 'approved' : 'rejected'}.`,
    });
  };

  const handleFinalize = (bookId: string) => {
    moveBookDocuments(bookId, 'Archived');
    updateBookStatus(bookId, 'Complete');
    toast({ title: "Book Archived", description: "The book has been moved to long-term storage." });
  };
  
  const handleMarkAsCorrected = (bookId: string) => {
    moveBookDocuments(bookId, 'Corrected');
    updateBookStatus(bookId, 'Corrected');
    toast({ title: "Book Corrected", description: "The book is now ready for resubmission." });
  };

  const handleResubmit = (bookId: string, targetStage: string) => {
    moveBookDocuments(bookId, targetStage);
    updateBookStatus(bookId, 'In Progress');
    toast({ title: "Book Resubmitted", description: `The book has been sent back to ${targetStage}.` });
  };
  
  const addPageToBook = (bookId: string, position: number) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    setDocuments(prevDocs => {
      const otherPages = prevDocs.filter(p => p.bookId !== bookId);
      const bookPages = prevDocs.filter(p => p.bookId === bookId);

      const getPageNum = (name: string): number | null => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const newPage: AppDocument = {
        id: `doc_${book.id}_new_${Date.now()}`,
        name: `${book.name} - Page ${position} (Added)`,
        clientId: book.clientId,
        client: book.clientName,
        status: 'Client Rejected',
        statusId: 'ds_13',
        type: 'Added Page',
        lastUpdated: new Date().toISOString().slice(0, 10),
        tags: ['added', 'corrected'],
        folderId: null,
        projectId: book.projectId,
        bookId: book.id,
      };

      const updatedPages = bookPages.map(page => {
        const pageNum = getPageNum(page.name);
        if (pageNum !== null && pageNum >= position) {
          const newPageNum = pageNum + 1;
          return { ...page, name: page.name.replace(/ - Page \d+/, ` - Page ${newPageNum}`) };
        }
        return page;
      });
      
      updatedPages.splice(position - 1, 0, newPage);

      return [...otherPages, ...updatedPages];
    });

    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, documentCount: b.documentCount + 1, expectedDocuments: b.expectedDocuments + 1 } : b));
    
    toast({
      title: "Page Added",
      description: `A new page has been inserted at position ${position} in "${book.name}".`,
    });
  }

  const deletePageFromBook = (pageId: string, bookId: string) => {
    setDocuments(prev => prev.filter(p => p.id !== pageId));
    setBooks(prev => prev.map(b => b.id === bookId ? {...b, documentCount: b.documentCount - 1, expectedDocuments: b.expectedDocuments - 1 } : b));
  }

  const updateDocumentStatus = (docId: string, newStatus: string) => {
    setDocuments(prevDocs =>
        prevDocs.map(doc =>
            doc.id === docId ? { ...doc, status: newStatus } : doc
        )
    );
  };

  const value = { 
    clients, users, projects, books, documents, auditLogs,
    addClient, updateClient, deleteClient,
    addUser, updateUser, deleteUser,
    addProject, updateProject, deleteProject,
    addBook, updateBook, deleteBook, importBooks,
    handleBookAction, handleMoveBookToNextStage, handleClientAction,
    handleFinalize, handleMarkAsCorrected, handleResubmit,
    addPageToBook, deletePageFromBook, updateDocumentStatus,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
