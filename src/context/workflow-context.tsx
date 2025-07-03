
"use client"

import * as React from 'react';
import type { Client, User, Project, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog, ProcessingLog, Permissions } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

// Define the shape of the book data when importing
export interface BookImport {
  name: string;
  expectedDocuments: number;
}


// This map defines the status transition for books (physical items)
const bookStatusTransition: { [key: string]: string } = {
  'Pending': 'To Scan',
  'To Scan': 'Scanning Started',
  'Scanning Started': 'Scanned',
};

// This map defines the status transition for entire books of documents (digital items)
const digitalStageTransitions: { [key: string]: string } = {
    'Storage': 'Indexing',
    'Indexing': 'Quality Control',
    'Quality Control': 'Ready for Processing',
    'Processed': 'Final Quality Control',
    'Final Quality Control': 'Delivery',
    'Delivery': 'Pending Validation',
}

// Client-side representation of a document
export type AppDocument = RawDocument & { client: string; status: string; flag: 'error' | 'warning' | 'info' | null; flagComment?: string; };

export type EnrichedAuditLog = AuditLog & { user: string; };

type AppContextType = {
  // Auth state
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // State (filtered by project or based on user)
  clients: Client[];
  users: User[];
  scannerUsers: User[];
  projects: EnrichedProject[];
  books: EnrichedBook[];
  documents: AppDocument[];
  auditLogs: EnrichedAuditLog[];
  processingLogs: ProcessingLog[];
  roles: string[];
  permissions: Permissions;
  
  // Global Project Filter
  allProjects: EnrichedProject[];
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;

  // Client Actions
  addClient: (clientData: Omit<Client, 'id'>) => void;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => void;
  deleteClient: (clientId: string) => void;

  // User Actions
  addUser: (userData: Omit<User, 'id' | 'avatar' | 'lastLogin'>) => void;
  updateUser: (userId: string, userData: Partial<Omit<User, 'id' | 'avatar' | 'lastLogin'>>) => void;
  deleteUser: (userId: string) => void;

  // Project Actions
  addProject: (projectData: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (projectId: string) => void;

  // Book Actions
  addBook: (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'status'>) => void;
  updateBook: (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'status'>>) => void;
  deleteBook: (bookId: string) => void;
  importBooks: (projectId: string, newBooks: BookImport[]) => void;

  // Workflow Actions
  handleBookAction: (bookId: string, currentStatus: string, payload?: { actualPageCount?: number, scannerUserId?: string }) => void;
  handleMoveBookToNextStage: (bookId: string, currentStage: string) => void;
  handleStartProcessing: (bookId: string) => void;
  handleCompleteProcessing: (bookId: string) => void;
  handleClientAction: (bookId: string, action: 'approve' | 'reject', reason?: string) => void;
  handleFinalize: (bookId: string) => void;
  handleMarkAsCorrected: (bookId: string) => void;
  handleResubmit: (bookId: string, targetStage: string) => void;
  addPageToBook: (bookId: string, position: number) => void;
  deletePageFromBook: (pageId: string, bookId: string) => void;
  updateDocumentStatus: (docId: string, newStatus: string) => void;
  updateDocumentFlag: (docId: string, flag: AppDocument['flag'], comment?: string) => void;
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({
  initialClients,
  initialUsers,
  initialProjects,
  initialBooks,
  initialDocuments,
  initialAuditLogs,
  initialProcessingLogs,
  initialPermissions,
  initialRoles,
  children,
}: {
  initialClients: Client[];
  initialUsers: User[];
  initialProjects: Project[];
  initialBooks: RawBook[];
  initialDocuments: AppDocument[];
  initialAuditLogs: EnrichedAuditLog[];
  initialProcessingLogs: ProcessingLog[];
  initialPermissions: Permissions;
  initialRoles: string[];
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [clients, setClients] = React.useState<Client[]>(initialClients);
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [books, setBooks] = React.useState<RawBook[]>(initialBooks);
  const [documents, setDocuments] = React.useState<AppDocument[]>(initialDocuments);
  const [auditLogs, setAuditLogs] = React.useState<EnrichedAuditLog[]>(initialAuditLogs);
  const [processingLogs, setProcessingLogs] = React.useState<ProcessingLog[]>(initialProcessingLogs);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const { toast } = useToast();
  
  // Auto-login on mount
  React.useEffect(() => {
    const storedUserId = localStorage.getItem('flowvault_userid');
    if (storedUserId) {
      const user = initialUsers.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, [initialUsers]);

  const login = (username: string, password: string): boolean => {
    // Find user by username and password. For this example, passwords are in plain text.
    // In a real application, you would hash and compare passwords.
    const user = initialUsers.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('flowvault_userid', user.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('flowvault_userid');
    // The redirect will be handled by the layout effect
  };
  
  // --- Memoized Data Enrichment ---
  const enrichedBooks: EnrichedBook[] = React.useMemo(() => {
    return books.map(book => {
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
    })
  }, [books, projects, clients, documents]);

  const enrichedProjects: EnrichedProject[] = React.useMemo(() => {
    return projects.map(project => {
        const client = clients.find(c => c.id === project.clientId);
        const projectBooks = enrichedBooks.filter(b => b.projectId === project.id);
        const projectDocuments = documents.filter(d => d.projectId === project.id);
        
        const totalExpected = projectBooks.reduce((sum, book) => sum + book.expectedDocuments, 0);
        const progress = totalExpected > 0 ? (projectDocuments.length / totalExpected) * 100 : 0;
        
        return {
            ...project,
            clientName: client?.name || 'Unknown Client',
            documentCount: projectDocuments.length,
            totalExpected,
            progress: Math.min(100, progress),
            books: projectBooks,
        };
    });
  }, [projects, clients, enrichedBooks, documents]);


  // --- CRUD ACTIONS ---

  // Clients
  const addClient = (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = { id: `cl_${Date.now()}`, ...clientData };
    setClients(prev => [...prev, newClient]);
    toast({ title: "Client Added", description: `Client "${newClient.name}" has been created.` });
  };

  const updateClient = (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...clientData } : c));
    toast({ title: "Client Updated", description: "Client details have been saved." });
  };

  const deleteClient = (clientId: string) => {
    const associatedProjectIds = projects.filter(p => p.clientId === clientId).map(p => p.id);
    
    setClients(prev => prev.filter(c => c.id !== clientId));
    setProjects(prev => prev.filter(p => p.clientId !== clientId));
    setBooks(prev => prev.filter(b => !associatedProjectIds.includes(b.projectId)));
    setDocuments(prev => prev.filter(d => d.clientId !== clientId));

    if (associatedProjectIds.includes(selectedProjectId!)) {
        setSelectedProjectId(null);
    }
    toast({ title: "Client Deleted", description: "Client and all associated projects/data have been deleted.", variant: "destructive" });
  };
  
  // Users
  const addUser = (userData: Omit<User, 'id' | 'avatar' | 'lastLogin'>) => {
    const newUser: User = { id: `u_${Date.now()}`, avatar: 'https://placehold.co/100x100.png', ...userData };
    setUsers(prev => [...prev, newUser]);
    toast({ title: "User Added", description: `User "${newUser.name}" has been created.` });
  };

  const updateUser = (userId: string, userData: Partial<Omit<User, 'id' | 'avatar' | 'lastLogin'>>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...userData } : u));
    toast({ title: "User Updated", description: "User details have been saved." });
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "User Deleted", description: "The user has been deleted.", variant: "destructive" });
  };
  
  // Projects
  const addProject = (projectData: Omit<Project, 'id'>) => {
    const newProjectData: Project = { id: `proj_${Date.now()}`, ...projectData };
    setProjects(prev => [...prev, newProjectData]);
    toast({ title: "Project Added", description: `Project "${newProjectData.name}" has been created.` });
  };
  
  const updateProject = (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...projectData } : p));
    toast({ title: "Project Updated" });
  };

  const deleteProject = (projectId: string) => {
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setBooks(prev => prev.filter(b => b.projectId !== projectId));
      setDocuments(prev => prev.filter(d => d.projectId !== projectId));
      toast({ title: "Project Deleted", variant: "destructive" });
  };

  // Books
  const addBook = (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'status'>) => {
      const newRawBook: RawBook = {
          id: `book_${Date.now()}`,
          status: 'Pending',
          projectId,
          ...bookData,
      };
      setBooks(prev => [...prev, newRawBook]);
      toast({ title: "Book Added", description: `Book "${newRawBook.name}" has been added.` });
  };
  
  const updateBook = (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'status'>>) => {
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...bookData } : b));
      toast({ title: "Book Updated" });
  };

  const deleteBook = (bookId: string) => {
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setDocuments(prev => prev.filter(d => d.bookId !== bookId));
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
        return newRawBook;
    });
    setBooks(prev => [...prev, ...booksToAdd]);
    toast({
        title: "Import Successful",
        description: `${booksToAdd.length} books have been added to the project.`
    });
  };


  // --- WORKFLOW ACTIONS ---

  const updateBookStatus = (bookId: string, newStatusName: string, updateFn?: (book: RawBook) => Partial<RawBook>) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: newStatusName, ...(updateFn ? updateFn(book) : {}) } : book
      )
    );
  };
  
  const handleBookAction = (bookId: string, currentStatus: string, payload?: { actualPageCount?: number, scannerUserId?: string }) => {
    const nextStatus = bookStatusTransition[currentStatus];
    if (!nextStatus) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Handle moving from Pending -> To Scan (with scanner assignment)
    if (currentStatus === 'Pending' && payload?.scannerUserId) {
      updateBookStatus(bookId, nextStatus, () => ({ scannerUserId: payload.scannerUserId }));
      toast({
        title: "Book Receipt Confirmed",
        description: `Book assigned and moved to "${nextStatus}".`
      });
      return;
    }
    
    // Handle moving from To Scan -> Scanning Started
    if (currentStatus === 'To Scan') {
      updateBookStatus(bookId, nextStatus, () => ({ scanStartTime: new Date().toISOString() }));
      toast({
        title: "Scanning Started",
        description: `Book moved to "${nextStatus}".`
      });
      return;
    }

    // Handle moving from Scanning Started -> Scanned
    if (currentStatus === 'Scanning Started') {
      updateBookStatus(bookId, nextStatus, () => ({ scanEndTime: new Date().toISOString() }));
      const project = projects.find(p => p.id === book.projectId);
      const client = clients.find(c => c.id === project?.clientId);
      if (!project || !client) return;

      const existingDocs = documents.some(d => d.bookId === book.id);
      if (existingDocs) {
         toast({ title: "Scanning Complete", description: `Book status updated to "${nextStatus}".` });
         return;
      }

      const pagesToCreate = payload?.actualPageCount ?? book.expectedDocuments;

      const newDocs: AppDocument[] = Array.from({ length: pagesToCreate }).map((_, i) => {
        const pageName = `${book.name} - Page ${i + 1}`;
        return {
          id: `doc_${book.id}_${i + 1}`,
          name: pageName,
          clientId: client.id,
          client: client.name,
          status: 'Storage',
          statusId: 'ds_4', // Corresponds to 'Storage'
          type: 'Scanned Page',
          lastUpdated: new Date().toISOString().slice(0, 10),
          tags: [],
          folderId: null,
          projectId: book.projectId,
          bookId: book.id,
          flag: null,
          imageUrl: `https://dummyimage.com/400x550/e0e0e0/5c5c5c.png&text=${encodeURIComponent(pageName)}`
        };
      });

      setDocuments(prevDocs => [...prevDocs, ...newDocs]);
      toast({
        title: "Scanning Complete",
        description: `${pagesToCreate} digital pages created in Storage.`
      });
      return;
    }
    
    // Fallback for other potential simple transitions if any
    updateBookStatus(bookId, nextStatus);
    toast({ title: "Book Status Updated", description: `Book moved to "${nextStatus}".` });
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

  const handleStartProcessing = (bookId: string) => {
    moveBookDocuments(bookId, 'In Processing');
    setProcessingLogs(prev => {
        // Remove old log if it exists
        const otherLogs = prev.filter(log => log.bookId !== bookId);
        const newLog: ProcessingLog = {
            id: `pl_${Date.now()}`,
            bookId: bookId,
            status: 'In Progress',
            progress: 0,
            log: `[${new Date().toLocaleTimeString()}] Processing initiated.`,
            startTime: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
        };
        return [...otherLogs, newLog];
    });
    toast({ title: 'Processing Started', description: 'The book has been sent to the processing queue.' });
  };
  
  const handleCompleteProcessing = (bookId: string) => {
    moveBookDocuments(bookId, 'Processed');
    setProcessingLogs(prev => prev.map(log => 
        log.bookId === bookId 
            ? { ...log, status: 'Complete', progress: 100, log: `${log.log}\n[${new Date().toLocaleTimeString()}] Processing complete.` } 
            : log
    ));
    toast({ title: 'Processing Complete', description: 'The book is now ready for Final QC.' });
  };

  const handleClientAction = (bookId: string, action: 'approve' | 'reject', reason?: string) => {
    const isApproval = action === 'approve';
    const newStatus = isApproval ? 'Finalized' : 'Client Rejected';
    const book = enrichedBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, newStatus);
    
    setBooks(prev => prev.map(b => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        status: newStatus,
        rejectionReason: isApproval ? undefined : reason,
      };
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
    const book = enrichedBooks.find(b => b.id === bookId);
    if (!book) return;

    setDocuments(prevDocs => {
      const otherPages = prevDocs.filter(p => p.bookId !== bookId);
      const bookPages = prevDocs.filter(p => p.bookId === bookId);

      const getPageNum = (name: string): number | null => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const newPageName = `${book.name} - Page ${position} (Added)`;
      const newPage: AppDocument = {
        id: `doc_${book.id}_new_${Date.now()}`,
        name: newPageName,
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
        flag: 'info',
        imageUrl: `https://dummyimage.com/400x550/e0e0e0/5c5c5c.png&text=${encodeURIComponent(newPageName)}`
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

  const updateDocumentFlag = (docId: string, flag: AppDocument['flag'], comment?: string) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc =>
        doc.id === docId ? { ...doc, flag, flagComment: flag ? comment : undefined } : doc
      )
    );
    const flagLabel = flag ? flag.charAt(0).toUpperCase() + flag.slice(1) : 'Cleared';
    toast({ title: `Flag ${flag ? 'Set' : 'Cleared'}`, description: `Document has been marked with: ${flagLabel}` });
  }

  // Memoized lists filtered by selected project
  const scannerUsers = React.useMemo(() => users.filter(user => user.role === 'Scanning'), [users]);

  const filteredProjects = React.useMemo(() => {
    if (!selectedProjectId) return enrichedProjects;
    return enrichedProjects.filter(p => p.id === selectedProjectId);
  }, [enrichedProjects, selectedProjectId]);

  const filteredBooks = React.useMemo(() => {
    if (!selectedProjectId) return enrichedBooks;
    return enrichedBooks.filter(b => b.projectId === selectedProjectId);
  }, [enrichedBooks, selectedProjectId]);

  const filteredDocuments = React.useMemo(() => {
    if (!selectedProjectId) return documents;
    return documents.filter(d => d.projectId === selectedProjectId);
  }, [documents, selectedProjectId]);

  const value = { 
    currentUser, login, logout,
    clients, users, scannerUsers,
    projects: filteredProjects, 
    books: filteredBooks, 
    documents: filteredDocuments, 
    auditLogs,
    processingLogs,
    roles: initialRoles,
    permissions: initialPermissions,
    allProjects: enrichedProjects,
    selectedProjectId,
    setSelectedProjectId,
    addClient, updateClient, deleteClient,
    addUser, updateUser, deleteUser,
    addProject, updateProject, deleteProject,
    addBook, updateBook, deleteBook, importBooks,
    handleBookAction, handleMoveBookToNextStage, handleClientAction,
    handleFinalize, handleMarkAsCorrected, handleResubmit,
    addPageToBook, deletePageFromBook, updateDocumentStatus,
    updateDocumentFlag, handleStartProcessing, handleCompleteProcessing,
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
