
"use client"

import * as React from 'react';
import type { Client, User, Project, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog, ProcessingLog, Permissions, ProjectWorkflows, RejectionTag } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

// Define the shape of the book data when importing
export interface BookImport {
  name: string;
  expectedDocuments: number;
}


// This map defines the status transition for books (physical items) for simple, one-click actions
const bookStatusTransition: { [key: string]: string } = {
  'In Transit': 'Received',
  // 'Received' to 'To Scan' is handled by assignment
  'To Scan': 'Scanning Started',
  'Scanning Started': 'In Progress', // After scan, docs are in Storage, book is 'In Progress'
};

// This map defines the status transition for entire books of documents (digital items)
const digitalStageTransitions: { [key: string]: string } = {
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
  login: (username: string, password: string) => User | null;
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
  projectWorkflows: ProjectWorkflows;
  rejectionTags: RejectionTag[];
  
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
  toggleUserStatus: (userId: string) => void;
  
  // Role Actions
  addRole: (roleName: string, permissions: string[]) => void;
  updateRole: (roleName: string, permissions: string[]) => void;
  deleteRole: (roleName: string) => void;

  // Project Actions
  addProject: (projectData: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (projectId: string) => void;
  updateProjectWorkflow: (projectId: string, workflow: string[]) => void;

  // Book Actions
  addBook: (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'status'>) => void;
  updateBook: (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'status'>>) => void;
  deleteBook: (bookId: string) => void;
  importBooks: (projectId: string, newBooks: BookImport[]) => void;
  
  // Rejection Tag Actions
  addRejectionTag: (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => void;
  updateRejectionTag: (tagId: string, tagData: Partial<Omit<RejectionTag, 'id' | 'clientId'>>) => void;
  deleteRejectionTag: (tagId: string) => void;
  tagPageForRejection: (pageId: string, tags: string[]) => void;
  clearPageRejectionTags: (pageId: string, tagsToKeep?: string[]) => void;


  // Workflow Actions
  handleMarkAsShipped: (bookIds: string[]) => void;
  handleBookAction: (bookId: string, currentStatus: string, payload?: { actualPageCount?: number }) => void;
  handleMoveBookToNextStage: (bookId: string, currentStage: string) => void;
  handleAssignUser: (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => void;
  handleStartTask: (bookId: string, role: 'indexing' | 'qc') => void;
  handleCancelTask: (bookId: string, currentStatus: string) => void;
  handleAdminStatusOverride: (bookId: string, newStatus: string, reason: string) => void;
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

const OPERATOR_ROLES = ["Operator", "QC Specialist", "Reception", "Scanning", "Indexing", "Processing", "Delivery", "Correction Specialist", "Multi-Operator"];

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
  initialProjectWorkflows,
  initialRejectionTags,
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
  initialProjectWorkflows: ProjectWorkflows;
  initialRejectionTags: RejectionTag[];
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
  const [roles, setRoles] = React.useState<string[]>(initialRoles);
  const [permissions, setPermissions] = React.useState<Permissions>(initialPermissions);
  const [projectWorkflows, setProjectWorkflows] = React.useState<ProjectWorkflows>(initialProjectWorkflows);
  const [rejectionTags, setRejectionTags] = React.useState<RejectionTag[]>(initialRejectionTags);
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

  const login = (username: string, password: string): User | null => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      if (user.status === 'disabled') {
        toast({
          title: "Login Failed",
          description: "Your account is disabled. Please contact an administrator.",
          variant: "destructive"
        });
        return null;
      }
      setCurrentUser(user);
      localStorage.setItem('flowvault_userid', user.id);
      return user;
    }
    return null;
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

  const allEnrichedProjects: EnrichedProject[] = React.useMemo(() => {
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
    setRejectionTags(prev => prev.filter(t => t.clientId !== clientId));

    if (associatedProjectIds.includes(selectedProjectId!)) {
        setSelectedProjectId(null);
    }
    logAction('Client Deleted', `Client "${clientToDelete?.name}" and all data deleted.`, {});
    toast({ title: "Client Deleted", description: "Client and all associated projects/data have been deleted.", variant: "destructive" });
  };
  
  const addUser = (userData: Omit<User, 'id' | 'avatar' | 'lastLogin'>) => {
    const newUser: User = { id: `u_${Date.now()}`, avatar: 'https://placehold.co/100x100.png', status: 'active', ...userData };
    setUsers(prev => [...prev, newUser]);
    logAction('User Created', `New user "${newUser.name}" added with role ${newUser.role}.`, {});
    toast({ title: "User Added", description: `User "${newUser.name}" has been created.` });
  };

  const updateUser = (userId: string, userData: Partial<Omit<User, 'id' | 'avatar' | 'lastLogin'>>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...userData } : u));
    logAction('User Updated', `Details for user "${userData.name}" updated.`, {});
    toast({ title: "User Updated", description: "User details have been saved." });
  };
  
  const toggleUserStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'System') return; // Cannot disable system user

    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    logAction(
      'User Status Changed', 
      `User "${user.name}" was ${newStatus === 'active' ? 'enabled' : 'disabled'}.`, 
      {}
    );
    toast({ title: `User ${newStatus === 'active' ? 'Enabled' : 'Disabled'}` });
  };

  const deleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete || userToDelete.role === 'System') return;
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

  // --- ROLE ACTIONS ---
  const addRole = (roleName: string, rolePermissions: string[]) => {
    if (roles.includes(roleName)) {
      toast({ title: "Role Exists", description: "A role with this name already exists.", variant: "destructive" });
      return;
    }
    setRoles(prev => [...prev, roleName]);
    setPermissions(prev => ({...prev, [roleName]: rolePermissions }));
    logAction('Role Created', `New role "${roleName}" was created.`, {});
    toast({ title: "Role Created", description: `Role "${roleName}" has been added.` });
  };

  const updateRole = (roleName: string, rolePermissions: string[]) => {
    setPermissions(prev => ({...prev, [roleName]: rolePermissions }));
    logAction('Role Updated', `Permissions for role "${roleName}" were updated.`, {});
    toast({ title: "Role Updated", description: `Permissions for "${roleName}" have been saved.` });
  };
  
  const deleteRole = (roleName: string) => {
    setRoles(prev => prev.filter(r => r !== roleName));
    setPermissions(prev => {
      const newPerms = { ...prev };
      delete newPerms[roleName];
      return newPerms;
    });
    setUsers(prev => prev.map(u => u.role === roleName ? { ...u, role: '' } : u)); // Unassign users
    logAction('Role Deleted', `Role "${roleName}" was deleted.`, {});
    toast({ title: "Role Deleted", description: `Role "${roleName}" has been deleted.`, variant: "destructive" });
  };

  const updateProjectWorkflow = (projectId: string, workflow: string[]) => {
    setProjectWorkflows(prev => ({ ...prev, [projectId]: workflow }));
    logAction('Project Workflow Updated', `Workflow for project ID ${projectId} was updated.`, {});
    toast({ title: "Project Workflow Updated" });
  };

  // --- REJECTION TAG ACTIONS ---
  const addRejectionTag = (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => {
    if (!clientId) {
      toast({ title: "Client ID is missing", variant: "destructive" });
      return;
    }
    const newTag: RejectionTag = { id: `rt_${Date.now()}`, clientId: clientId, ...tagData };
    setRejectionTags(prev => [...prev, newTag]);
    const client = clients.find(c => c.id === clientId);
    const actor = currentUser?.role === 'Admin' ? 'Admin' : `Client "${currentUser?.name}"`;
    logAction('Rejection Tag Created', `${actor} created tag: "${newTag.label}" for client "${client?.name}".`, {});
    toast({ title: "Rejection Reason Added" });
  };

  const updateRejectionTag = (tagId: string, tagData: Partial<Omit<RejectionTag, 'id' | 'clientId'>>) => {
    setRejectionTags(prev => prev.map(t => t.id === tagId ? { ...t, ...tagData } : t));
    logAction('Rejection Tag Updated', `Tag "${tagData.label}" updated.`, {});
    toast({ title: "Rejection Reason Updated" });
  };

  const deleteRejectionTag = (tagId: string) => {
    const tag = rejectionTags.find(t => t.id === tagId);
    setRejectionTags(prev => prev.filter(t => t.id !== tagId));
    logAction('Rejection Tag Deleted', `Tag "${tag?.label}" deleted.`, {});
    toast({ title: "Rejection Reason Deleted", variant: 'destructive' });
  };

  const tagPageForRejection = (pageId: string, tags: string[]) => {
    const page = documents.find(d => d.id === pageId);
    if (!page) return;
    
    setDocuments(prevDocs => 
      prevDocs.map(doc => 
        doc.id === pageId ? { ...doc, tags: tags } : doc
      )
    );
    
    logAction(
      'Rejection Tags Updated',
      `Tags for page "${page.name}" set to: ${tags.join(', ') || 'None'}.`,
      { documentId: pageId, bookId: page.bookId }
    );
    toast({ title: "Tags Updated", description: "The rejection tags for the page have been updated." });
  };
  
  const clearPageRejectionTags = (pageId: string, tagsToKeep: string[] = []) => {
    const page = documents.find(d => d.id === pageId);
    if (!page) return;

    setDocuments(prevDocs => 
      prevDocs.map(doc => doc.id === pageId ? { ...doc, tags: tagsToKeep } : doc)
    );

    logAction(
        'Rejection Tags Modified', 
        `Tags updated for page "${page.name}". Kept: ${tagsToKeep.join(', ')}.`, 
        { documentId: pageId, bookId: page.bookId }
    );
    toast({ title: "Tags Updated" });
  }

  // --- WORKFLOW ACTIONS ---

  const updateBookStatus = React.useCallback((bookId: string, newStatusName: string, updateFn?: (book: RawBook) => Partial<RawBook>) => {
    setRawBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: newStatusName, ...(updateFn ? updateFn(book) : {}) } : book
      )
    );
  }, []);
  
  const moveBookDocuments = React.useCallback((bookId: string, newStatus: string) => {
    setDocuments(prevDocs =>
        prevDocs.map(doc =>
            doc.bookId === bookId ? { ...doc, status: newStatus } : doc
        )
    );
  }, []);

  const handleMarkAsShipped = (bookIds: string[]) => {
    setRawBooks(prevBooks =>
      prevBooks.map(book =>
        bookIds.includes(book.id) && book.status === 'Pending' ? { ...book, status: 'In Transit' } : book
      )
    );
    bookIds.forEach(bookId => {
      const book = rawBooks.find(b => b.id === bookId);
      logAction('Book Shipped', `Client marked book "${book?.name}" as shipped.`, { bookId });
    });
    toast({ title: `${bookIds.length} Book(s) Marked as Shipped` });
  };

  const handleBookAction = (bookId: string, currentStatus: string, payload?: { actualPageCount?: number }) => {
    const nextStatus = bookStatusTransition[currentStatus];
    if (!nextStatus) return;

    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;

    if(currentStatus === 'In Transit') {
        updateBookStatus(bookId, "Received");
        logAction('Reception Confirmed', `Book "${book?.name}" has been marked as received.`, { bookId });
        toast({ title: "Reception Confirmed" });
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
  

  const handleMoveBookToNextStage = (bookId: string, currentStage: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    
    // This is a special handler for marking checking as complete
    if (currentStage === 'Checking Started') {
        moveBookDocuments(bookId, 'Ready for Processing');
        updateBookStatus(bookId, 'Ready for Processing');
        logAction('Initial QC Complete', `Book "${book?.name}" has passed initial checks.`, { bookId });
        toast({ title: "Initial QC Complete", description: 'Book moved to Ready for Processing.' });
        return;
    }

    const nextStage = digitalStageTransitions[currentStage];
    if (!nextStage) return;

    moveBookDocuments(bookId, nextStage);
    logAction('Workflow Step', `Book "${book?.name}" moved from ${currentStage} to ${nextStage}.`, { bookId });
    toast({ title: "Workflow Action", description: `Book moved to ${nextStage}.` });
  };

  const handleAssignUser = (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => {
    const user = users.find(u => u.id === userId);
    const book = rawBooks.find(b => b.id === bookId);
    if (!user || !book) return;

    if (role === 'scanner') {
        updateBookStatus(bookId, "To Scan", () => ({ scannerUserId: userId }));
        moveBookDocuments(bookId, "To Scan");
        logAction('Assigned to Scanner', `Book "${book.name}" assigned to ${user.name}.`, { bookId });
        toast({ title: "Book Assigned", description: `Assigned to ${user.name} for scanning.` });
    } else if (role === 'indexer') {
        updateBookStatus(bookId, "To Indexing", () => ({ indexerUserId: userId }));
        moveBookDocuments(bookId, "To Indexing");
        logAction('Assigned to Indexer', `Book "${book.name}" assigned to ${user.name}.`, { bookId });
        toast({ title: "Book Assigned", description: `Assigned to ${user.name} for indexing.` });
    } else if (role === 'qc') {
        updateBookStatus(bookId, "To Checking", () => ({ qcUserId: userId, indexingStartTime: undefined, indexingEndTime: new Date().toISOString() }));
        moveBookDocuments(bookId, "To Checking");
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

  const handleCancelTask = (bookId: string, currentStatus: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;

    const updates: { [key: string]: { bookStatus: string, docStatus: string, logMsg: string, clearTime: 'scan' | 'index' | 'qc' } } = {
      'Scanning Started': { bookStatus: 'To Scan', docStatus: 'To Scan', logMsg: 'Scanning', clearTime: 'scan' },
      'Indexing Started': { bookStatus: 'To Indexing', docStatus: 'To Indexing', logMsg: 'Indexing', clearTime: 'index' },
      'Checking Started': { bookStatus: 'To Checking', docStatus: 'To Checking', logMsg: 'Checking', clearTime: 'qc' },
    };

    const update = updates[currentStatus];
    if (!update) return;

    setRawBooks(prev => prev.map(b => {
      if (b.id !== bookId) return b;
      const newBook: RawBook = { ...b, status: update.bookStatus };
      if (update.clearTime === 'scan') newBook.scanStartTime = undefined;
      if (update.clearTime === 'index') newBook.indexingStartTime = undefined;
      if (update.clearTime === 'qc') newBook.qcStartTime = undefined;
      return newBook;
    }));

    moveBookDocuments(bookId, update.docStatus);
    logAction('Task Cancelled', `${update.logMsg} for book "${book.name}" was cancelled.`, { bookId });
    toast({ title: 'Task Cancelled', description: `Book returned to ${update.bookStatus} Queue.`, variant: 'destructive' });
  };
  
  const handleAdminStatusOverride = (bookId: string, newStatus: string, reason: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;

    updateBookStatus(bookId, newStatus);
    moveBookDocuments(bookId, newStatus);

    logAction(
        'Admin Status Override', 
        `Status of "${book.name}" manually changed to "${newStatus}". Reason: ${reason}`,
        { bookId }
    );
    toast({ title: "Status Overridden", description: `Book is now in status: ${newStatus}` });
  };


  const handleStartProcessing = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    moveBookDocuments(bookId, 'In Processing');
    updateBookStatus(bookId, 'In Processing');
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
    updateBookStatus(bookId, 'Processed');
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
      docStatus = 'To Indexing'; // Docs go back to storage to be assigned
    } else if (targetStage === 'To Checking') {
      bookStatus = 'To Checking';
      docStatus = 'To Checking'; // Docs go back to indexed to be assigned
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

  // --- Contextual Data Filtering ---
  const projectsForContext = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Client' && currentUser.clientId) {
        return allEnrichedProjects.filter(p => p.clientId === currentUser.clientId);
    }
    if (OPERATOR_ROLES.includes(currentUser.role) && currentUser.projectIds?.length) {
      const operatorProjectIds = new Set(currentUser.projectIds);
      return allEnrichedProjects.filter(p => operatorProjectIds.has(p.id));
    }
    return allEnrichedProjects;
  }, [allEnrichedProjects, currentUser]);
  
  const booksForContext = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Client' && currentUser.clientId) {
        return enrichedBooks.filter(b => b.clientId === currentUser.clientId);
    }
    if (OPERATOR_ROLES.includes(currentUser.role) && currentUser.projectIds?.length) {
      const operatorProjectIds = new Set(currentUser.projectIds);
      return enrichedBooks.filter(b => operatorProjectIds.has(b.projectId));
    }
    return enrichedBooks;
  }, [enrichedBooks, currentUser]);

  const documentsForContext = React.useMemo(() => {
      if (!currentUser) return [];
      if (currentUser.role === 'Client' && currentUser.clientId) {
        return documents.filter(d => d.clientId === currentUser.clientId);
    }
    if (OPERATOR_ROLES.includes(currentUser.role) && currentUser.projectIds?.length) {
      const operatorProjectIds = new Set(currentUser.projectIds);
      return documents.filter(d => d.projectId && operatorProjectIds.has(d.projectId));
    }
    return documents;
  }, [documents, currentUser]);


  const value = { 
    currentUser, login, logout,
    clients, users, scannerUsers, indexerUsers, qcUsers,
    projects: projectsForContext, 
    books: booksForContext, 
    documents: documentsForContext, 
    auditLogs,
    processingLogs,
    roles,
    permissions,
    projectWorkflows,
    rejectionTags,
    allProjects: projectsForContext, // This should now be filtered for operators
    selectedProjectId,
    setSelectedProjectId,
    addClient, updateClient, deleteClient,
    addUser, updateUser, deleteUser, toggleUserStatus,
    addRole, updateRole, deleteRole,
    addProject, updateProject, deleteProject,
    updateProjectWorkflow,
    addBook, updateBook, deleteBook, importBooks,
    addRejectionTag, updateRejectionTag, deleteRejectionTag,
    tagPageForRejection, clearPageRejectionTags,
    handleMarkAsShipped,
    handleBookAction, handleMoveBookToNextStage, handleClientAction,
    handleFinalize, handleMarkAsCorrected, handleResubmit,
    addPageToBook, deletePageFromBook, updateDocumentStatus,
    updateDocumentFlag, handleStartProcessing, handleCompleteProcessing,
    handleAssignUser, handleStartTask, handleCancelTask,
    handleAdminStatusOverride,
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
