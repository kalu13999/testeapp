
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
  'Scanning Started': 'Storage', // After scan, docs are in Storage
};

// This map defines the status transition for entire books of documents (digital items)
const digitalStageTransitions: { [key: string]: string } = {
    'Checking Started': 'Ready for Processing',
    'Processed': 'Final Quality Control',
    'Final Quality Control': 'Delivery',
    'Delivery': 'Pending Validation',
}

// Client-side representation of a document
export type AppDocument = RawDocument & { client: string; status: string; };
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
  indexerUsers: User[];
  qcUsers: User[];
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
  handleAssignUser: (bookId: string, userId: string, role: 'indexer' | 'qc') => void;
  handleStartTask: (bookId: string, role: 'indexing' | 'qc') => void;
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
  const [rawProjects, setRawProjects] = React.useState<Project[]>(initialProjects);
  const [rawBooks, setRawBooks] = React.useState<RawBook[]>(initialBooks);
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
  };
  
  // --- Centralized Action Logger ---
  const logAction = React.useCallback((
    action: string, 
    details: string, 
    ids: { bookId?: string, documentId?: string }
  ) => {
    if (!currentUser) return;
    const newLogEntry: EnrichedAuditLog = {
      id: `al_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action,
      details,
      userId: currentUser.id,
      user: currentUser.name,
      date: new Date().toISOString(),
      ...ids,
    };
    setAuditLogs(prev => [newLogEntry, ...prev]);
  }, [currentUser]);

  // --- Memoized Data Enrichment ---
  const enrichedBooks: EnrichedBook[] = React.useMemo(() => {
    return rawBooks.map(book => {
      const project = rawProjects.find(p => p.id === book.projectId);
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
  }, [rawBooks, rawProjects, clients, documents]);

  const enrichedProjects: EnrichedProject[] = React.useMemo(() => {
    return rawProjects.map(project => {
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
  }, [rawProjects, clients, enrichedBooks, documents]);


  // --- CRUD ACTIONS ---

  const addClient = (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = { id: `cl_${Date.now()}`, ...clientData };
    setClients(prev => [...prev, newClient]);
    logAction('Client Created', `New client "${newClient.name}" added.`, {});
    toast({ title: "Client Added", description: `Client "${newClient.name}" has been created.` });
  };

  const updateClient = (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...clientData } : c));
    logAction('Client Updated', `Details for "${clientData.name}" updated.`, {});
    toast({ title: "Client Updated", description: "Client details have been saved." });
  };

  const deleteClient = (clientId: string) => {
    const clientToDelete = clients.find(c => c.id === clientId);
    const associatedProjectIds = rawProjects.filter(p => p.clientId === clientId).map(p => p.id);
    
    setClients(prev => prev.filter(c => c.id !== clientId));
    setRawProjects(prev => prev.filter(p => p.clientId !== clientId));
    setRawBooks(prev => prev.filter(b => !associatedProjectIds.includes(b.projectId)));
    setDocuments(prev => prev.filter(d => d.clientId !== clientId));

    if (associatedProjectIds.includes(selectedProjectId!)) {
        setSelectedProjectId(null);
    }
    logAction('Client Deleted', `Client "${clientToDelete?.name}" and all data deleted.`, {});
    toast({ title: "Client Deleted", description: "Client and all associated projects/data have been deleted.", variant: "destructive" });
  };
  
  const addUser = (userData: Omit<User, 'id' | 'avatar' | 'lastLogin'>) => {
    const newUser: User = { id: `u_${Date.now()}`, avatar: 'https://placehold.co/100x100.png', ...userData };
    setUsers(prev => [...prev, newUser]);
    logAction('User Created', `New user "${newUser.name}" added with role ${newUser.role}.`, {});
    toast({ title: "User Added", description: `User "${newUser.name}" has been created.` });
  };

  const updateUser = (userId: string, userData: Partial<Omit<User, 'id' | 'avatar' | 'lastLogin'>>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...userData } : u));
    logAction('User Updated', `Details for user "${userData.name}" updated.`, {});
    toast({ title: "User Updated", description: "User details have been saved." });
  };

  const deleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    logAction('User Deleted', `User "${userToDelete?.name}" was deleted.`, {});
    toast({ title: "User Deleted", description: "The user has been deleted.", variant: "destructive" });
  };
  
  const addProject = (projectData: Omit<Project, 'id'>) => {
    const newProjectData: Project = { id: `proj_${Date.now()}`, ...projectData };
    setRawProjects(prev => [...prev, newProjectData]);
    logAction('Project Created', `New project "${newProjectData.name}" added.`, {});
    toast({ title: "Project Added", description: `Project "${newProjectData.name}" has been created.` });
  };
  
  const updateProject = (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => {
    setRawProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...projectData } : p));
    logAction('Project Updated', `Details for project "${projectData.name}" updated.`, {});
    toast({ title: "Project Updated" });
  };

  const deleteProject = (projectId: string) => {
      const projectToDelete = rawProjects.find(p => p.id === projectId);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      setRawProjects(prev => prev.filter(p => p.id !== projectId));
      setRawBooks(prev => prev.filter(b => b.projectId !== projectId));
      setDocuments(prev => prev.filter(d => d.projectId !== projectId));
      logAction('Project Deleted', `Project "${projectToDelete?.name}" and all data deleted.`, {});
      toast({ title: "Project Deleted", variant: "destructive" });
  };

  const addBook = (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'status'>) => {
      const newRawBook: RawBook = {
          id: `book_${Date.now()}`,
          status: 'Pending',
          projectId,
          ...bookData,
      };
      setRawBooks(prev => [...prev, newRawBook]);
      logAction('Book Added', `Book "${newRawBook.name}" was added to project.`, { bookId: newRawBook.id });
      toast({ title: "Book Added", description: `Book "${newRawBook.name}" has been added.` });
  };
  
  const updateBook = (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'status'>>) => {
      setRawBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...bookData } : b));
      logAction('Book Updated', `Details for book "${bookData.name}" were updated.`, { bookId });
      toast({ title: "Book Updated" });
  };

  const deleteBook = (bookId: string) => {
      const bookToDelete = rawBooks.find(b => b.id === bookId);
      setRawBooks(prev => prev.filter(b => b.id !== bookId));
      setDocuments(prev => prev.filter(d => d.bookId !== bookId));
      logAction('Book Deleted', `Book "${bookToDelete?.name}" and its pages were deleted.`, { bookId });
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
    setRawBooks(prev => [...prev, ...booksToAdd]);
    logAction('Books Imported', `${booksToAdd.length} books imported for project.`, {});
    toast({
        title: "Import Successful",
        description: `${booksToAdd.length} books have been added to the project.`
    });
  };

  // --- WORKFLOW ACTIONS ---

  const updateBookStatus = (bookId: string, newStatusName: string, updateFn?: (book: RawBook) => Partial<RawBook>) => {
    setRawBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: newStatusName, ...(updateFn ? updateFn(book) : {}) } : book
      )
    );
  };
  
  const handleBookAction = (bookId: string, currentStatus: string, payload?: { actualPageCount?: number, scannerUserId?: string }) => {
    const nextStatus = bookStatusTransition[currentStatus];
    if (!nextStatus) return;

    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;

    if (currentStatus === 'Pending' && payload?.scannerUserId) {
      const scanner = users.find(u => u.id === payload.scannerUserId);
      updateBookStatus(bookId, nextStatus, () => ({ scannerUserId: payload.scannerUserId }));
      logAction('Reception Confirmed', `Assigned to scanner ${scanner?.name || 'Unknown'}.`, { bookId });
      toast({ title: "Book Receipt Confirmed" });
      return;
    }
    
    if (currentStatus === 'To Scan') {
      updateBookStatus(bookId, nextStatus, () => ({ scanStartTime: new Date().toISOString() }));
      logAction('Scanning Started', `Scanning process initiated for book.`, { bookId });
      toast({ title: "Scanning Started" });
      return;
    }

    if (currentStatus === 'Scanning Started') {
      const project = rawProjects.find(p => p.id === book.projectId);
      const client = clients.find(c => c.id === project?.clientId);
      if (!project || !client) return;

      const pagesToCreate = payload?.actualPageCount ?? book.expectedDocuments;

      const newDocs: AppDocument[] = Array.from({ length: pagesToCreate }).map((_, i) => {
        const pageName = `${book.name} - Page ${i + 1}`;
        return {
          id: `doc_${book.id}_${i + 1}`,
          name: pageName,
          clientId: client.id,
          client: client.name,
          status: 'Storage',
          statusId: 'ds_4',
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

      setDocuments(prevDocs => {
          const otherDocs = prevDocs.filter(d => d.bookId !== bookId);
          return [...otherDocs, ...newDocs];
      });
      updateBookStatus(bookId, "In Progress", () => ({ scanEndTime: new Date().toISOString() }));
      logAction('Scanning Finished', `${pagesToCreate} pages created. Book moved to Storage.`, { bookId });
      toast({ title: "Scanning Complete", description: `${pagesToCreate} pages created.` });
      return;
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
    const book = rawBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, nextStage);
    logAction('Workflow Step', `Book "${book?.name}" moved from ${currentStage} to ${nextStage}.`, { bookId });
    toast({ title: "Workflow Action", description: `Book moved to ${nextStage}.` });
  };

  const handleAssignUser = (bookId: string, userId: string, role: 'indexer' | 'qc') => {
    const user = users.find(u => u.id === userId);
    const book = rawBooks.find(b => b.id === bookId);
    if (!user || !book) return;

    if (role === 'indexer') {
        updateBookStatus(bookId, "To Indexing", () => ({ indexerUserId: userId }));
        logAction('Assigned to Indexer', `Book "${book.name}" assigned to ${user.name}.`, { bookId });
        toast({ title: "Book Assigned", description: `Assigned to ${user.name} for indexing.` });
    } else if (role === 'qc') {
        updateBookStatus(bookId, "To Checking", () => ({ qcUserId: userId }));
        logAction('Assigned for QC', `Book "${book.name}" assigned to ${user.name}.`, { bookId });
        toast({ title: "Book Assigned", description: `Assigned to ${user.name} for checking.` });
    }
  };

  const handleStartTask = (bookId: string, role: 'indexing' | 'qc') => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;
    
    if (role === 'indexing') {
        updateBookStatus(bookId, 'Indexing Started', () => ({ indexingStartTime: new Date().toISOString() }));
        moveBookDocuments(bookId, 'Indexing Started');
        logAction('Indexing Started', `Indexing started for book "${book.name}".`, { bookId });
        toast({ title: "Indexing Started" });
    } else if (role === 'qc') {
        updateBookStatus(bookId, 'Checking Started', () => ({ qcStartTime: new Date().toISOString() }));
        moveBookDocuments(bookId, 'Checking Started');
        logAction('Checking Started', `Initial QC started for book "${book.name}".`, { bookId });
        toast({ title: "Checking Started" });
    }
  }


  const handleStartProcessing = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, 'In Processing');
    setProcessingLogs(prev => {
        const otherLogs = prev.filter(log => log.bookId !== bookId);
        const newLog: ProcessingLog = {
            id: `pl_${Date.now()}`, bookId: bookId, status: 'In Progress', progress: 0,
            log: `[${new Date().toLocaleTimeString()}] Processing initiated.`,
            startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
        };
        return [...otherLogs, newLog];
    });
    logAction('Processing Started', `Automated processing started for book "${book?.name}".`, { bookId });
    toast({ title: 'Processing Started' });
  };
  
  const handleCompleteProcessing = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, 'Processed');
    setProcessingLogs(prev => prev.map(log => 
        log.bookId === bookId 
            ? { ...log, status: 'Complete', progress: 100, log: `${log.log}\n[${new Date().toLocaleTimeString()}] Processing complete.` } 
            : log
    ));
    logAction('Processing Completed', `Automated processing finished for book "${book?.name}".`, { bookId });
    toast({ title: 'Processing Complete' });
  };

  const handleClientAction = (bookId: string, action: 'approve' | 'reject', reason?: string) => {
    const isApproval = action === 'approve';
    const newStatus = isApproval ? 'Finalized' : 'Client Rejected';
    const book = enrichedBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, newStatus);
    
    setRawBooks(prev => prev.map(b => b.id !== bookId ? b : { ...b, status: newStatus, rejectionReason: isApproval ? undefined : reason }));
    
    logAction(
      `Client ${isApproval ? 'Approval' : 'Rejection'}`, 
      isApproval ? `Book "${book?.name}" approved.` : `Book "${book?.name}" rejected. Reason: ${reason}`,
      { bookId }
    );

    toast({ title: `Book ${isApproval ? 'Approved' : 'Rejected'}` });
  };

  const handleFinalize = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, 'Archived');
    updateBookStatus(bookId, 'Complete');
    logAction('Book Archived', `Book "${book?.name}" was finalized and archived.`, { bookId });
    toast({ title: "Book Archived" });
  };
  
  const handleMarkAsCorrected = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, 'Corrected');
    updateBookStatus(bookId, 'Corrected');
    logAction('Marked as Corrected', `Book "${book?.name}" marked as corrected after client rejection.`, { bookId });
    toast({ title: "Book Corrected" });
  };

  const handleResubmit = (bookId: string, targetStage: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    let bookStatus = '';
    let docStatus = '';

    if (targetStage === 'To Indexing') {
      bookStatus = 'To Indexing';
      docStatus = 'Storage'; // Docs go back to storage to be assigned
    } else if (targetStage === 'To Checking') {
      bookStatus = 'To Checking';
      docStatus = 'Indexing Started'; // Docs go back to indexed to be assigned
    } else {
       bookStatus = 'In Progress';
       docStatus = targetStage;
    }

    moveBookDocuments(bookId, docStatus);
    updateBookStatus(bookId, bookStatus);
    logAction('Book Resubmitted', `Book "${book?.name}" resubmitted to ${targetStage}.`, { bookId });
    toast({ title: "Book Resubmitted" });
  };
  
  const addPageToBook = (bookId: string, position: number) => {
    const book = enrichedBooks.find(b => b.id === bookId);
    if (!book) return;

    const newPageName = `${book.name} - Page ${position} (Added)`;
    const newPageId = `doc_${book.id}_new_${Date.now()}`;
    const newPage: AppDocument = {
      id: newPageId,
      name: newPageName,
      clientId: book.clientId, client: book.clientName, status: 'Client Rejected', statusId: 'ds_13',
      type: 'Added Page', lastUpdated: new Date().toISOString().slice(0, 10), tags: ['added', 'corrected'],
      folderId: null, projectId: book.projectId, bookId: book.id, flag: 'info',
      imageUrl: `https://dummyimage.com/400x550/e0e0e0/5c5c5c.png&text=${encodeURIComponent(newPageName)}`
    };

    setDocuments(prevDocs => {
      const otherPages = prevDocs.filter(p => p.bookId !== bookId);
      const bookPages = prevDocs.filter(p => p.bookId === bookId);

      const getPageNum = (name: string): number | null => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : null;
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

    setRawBooks(prev => prev.map(b => b.id === bookId ? { ...b, documentCount: (b.documentCount || 0) + 1, expectedDocuments: (b.expectedDocuments || 0) + 1 } : b));
    logAction('Page Added', `New page added to "${book.name}" at position ${position}.`, { bookId, documentId: newPageId });
    toast({ title: "Page Added" });
  }

  const deletePageFromBook = (pageId: string, bookId: string) => {
    const page = documents.find(p => p.id === pageId);
    setDocuments(prev => prev.filter(p => p.id !== pageId));
    setRawBooks(prev => prev.map(b => b.id === bookId ? {...b, documentCount: (b.documentCount || 1) - 1, expectedDocuments: (b.expectedDocuments || 1) - 1 } : b));
    logAction('Page Deleted', `Page "${page?.name}" was deleted from book.`, { bookId, documentId: pageId });
  }

  const updateDocumentStatus = (docId: string, newStatus: string) => {
    let docName = '';
    setDocuments(prevDocs =>
        prevDocs.map(doc => {
          if (doc.id === docId) {
            docName = doc.name;
            return { ...doc, status: newStatus };
          }
          return doc;
        })
    );
    logAction('Document Status Changed', `Status of "${docName}" changed to ${newStatus}.`, { documentId: docId });
  };

  const updateDocumentFlag = (docId: string, flag: AppDocument['flag'], comment?: string) => {
    const doc = documents.find(d => d.id === docId);
    setDocuments(prevDocs =>
      prevDocs.map(d =>
        d.id === docId ? { ...d, flag, flagComment: flag ? comment : undefined } : d
      )
    );
    const flagLabel = flag ? flag.charAt(0).toUpperCase() + flag.slice(1) : 'Cleared';
    logAction(
      `Flag ${flag ? 'Set' : 'Cleared'}`, 
      `Document "${doc?.name}" marked with ${flagLabel}. Comment: ${comment || 'N/A'}`, 
      { documentId: docId, bookId: doc?.bookId }
    );
    toast({ title: `Flag ${flag ? 'Set' : 'Cleared'}`});
  }

  const scannerUsers = React.useMemo(() => users.filter(user => user.role === 'Scanning'), [users]);
  const indexerUsers = React.useMemo(() => users.filter(user => user.role === 'Indexing'), [users]);
  const qcUsers = React.useMemo(() => users.filter(user => user.role === 'QC Specialist'), [users]);

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
    clients, users, scannerUsers, indexerUsers, qcUsers,
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
    handleAssignUser, handleStartTask,
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
