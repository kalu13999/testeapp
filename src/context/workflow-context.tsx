

"use client"

import * as React from 'react';
import type { Client, User, Project, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog, ProcessingLog, Permissions, ProjectWorkflows, RejectionTag, DocumentStatus } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { WORKFLOW_SEQUENCE, STAGE_CONFIG, findStageKeyFromStatus } from '@/lib/workflow-config';
import * as dataApi from '@/lib/data';
import { UserFormValues } from '@/app/(app)/users/user-form';

// Define the shape of the book data when importing
export interface BookImport {
  name: string;
  expectedDocuments: number;
  priority?: 'Low' | 'Medium' | 'High';
  info?: string;
  author?: string;
  isbn?: string;
  publicationYear?: number;
}


// Client-side representation of a document
export type AppDocument = RawDocument & { client: string; status: string; };
export type EnrichedAuditLog = AuditLog & { user: string; };

type AppContextType = {
  // Loading state
  loading: boolean;
  
  // Auth state
  currentUser: User | null;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean>;

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
  accessibleProjectsForUser: EnrichedProject[];
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;

  // Client Actions
  addClient: (clientData: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  // User Actions
  addUser: (userData: UserFormValues) => Promise<void>;
  updateUser: (userId: string, userData: Partial<UserFormValues>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  updateUserDefaultProject: (userId: string, projectId: string | null) => void;
  
  // Role Actions
  addRole: (roleName: string, permissions: string[]) => void;
  updateRole: (roleName: string, permissions: string[]) => void;
  deleteRole: (roleName: string) => void;

  // Project Actions
  addProject: (projectData: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProjectWorkflow: (projectId: string, workflow: string[]) => void;

  // Book Actions
  addBook: (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => Promise<void>;
  updateBook: (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'statusId'>>) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  importBooks: (projectId: string, newBooks: BookImport[]) => Promise<void>;
  
  // Rejection Tag Actions
  addRejectionTag: (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => Promise<void>;
  updateRejectionTag: (tagId: string, tagData: Partial<Omit<RejectionTag, 'id' | 'clientId'>>) => Promise<void>;
  deleteRejectionTag: (tagId: string) => Promise<void>;
  tagPageForRejection: (pageId: string, tags: string[]) => Promise<void>;
  clearPageRejectionTags: (pageId: string, tagsToKeep?: string[]) => Promise<void>;


  // Workflow Actions
  getNextEnabledStage: (currentStage: string, workflow: string[]) => string | null;
  handleMarkAsShipped: (bookIds: string[]) => void;
  handleConfirmReception: (bookId: string) => void;
  handleSendToStorage: (bookId: string, payload: { actualPageCount: number }) => void;
  handleMoveBookToNextStage: (bookId: string, currentStatus: string) => void;
  handleAssignUser: (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => void;
  reassignUser: (bookId: string, newUserId: string, role: 'scanner' | 'indexer' | 'qc') => void;
  handleStartTask: (bookId: string, role: 'scanner' | 'indexing' | 'qc') => void;
  handleCancelTask: (bookId: string, currentStatus: string) => void;
  handleAdminStatusOverride: (bookId: string, newStatusName: string, reason: string) => void;
  handleStartProcessing: (bookId: string) => void;
  handleCompleteProcessing: (bookId: string) => void;
  handleClientAction: (bookId: string, action: 'approve' | 'reject', reason?: string) => void;
  handleFinalize: (bookId: string) => void;
  handleMarkAsCorrected: (bookId: string) => void;
  handleResubmit: (bookId: string, targetStage: string) => void;
  addPageToBook: (bookId: string, position: number) => Promise<void>;
  deletePageFromBook: (pageId: string, bookId: string) => Promise<void>;
  updateDocumentStatus: (docId: string, newStatus: string) => Promise<void>;
  updateDocumentFlag: (docId: string, flag: AppDocument['flag'], comment?: string) => Promise<void>;
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

const OPERATOR_ROLES = ["Operator", "QC Specialist", "Reception", "Scanning", "Indexing", "Processing", "Delivery", "Correction Specialist", "Multi-Operator", "Supervisor"];

const getDbSafeDate = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export function AppProvider({ children }: { children: React.ReactNode; }) {
  const [loading, setLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [rawProjects, setRawProjects] = React.useState<Project[]>([]);
  const [rawBooks, setRawBooks] = React.useState<RawBook[]>([]);
  const [documents, setDocuments] = React.useState<AppDocument[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<EnrichedAuditLog[]>([]);
  const [processingLogs, setProcessingLogs] = React.useState<ProcessingLog[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<Permissions>({});
  const [projectWorkflows, setProjectWorkflows] = React.useState<ProjectWorkflows>({});
  const [rejectionTags, setRejectionTags] = React.useState<RejectionTag[]>([]);
  const [statuses, setStatuses] = React.useState<DocumentStatus[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const { toast } = useToast();
  
  React.useEffect(() => {
    const loadData = async () => {
        try {
            setLoading(true);
            const [
                clientsData, usersData, projectsData, booksData, 
                docsData, auditData, processingData, permissionsData, 
                rolesData, workflowsData, rejectionData, statusesData
            ] = await Promise.all([
                dataApi.getClients(), dataApi.getUsers(), dataApi.getRawProjects(),
                dataApi.getRawBooks(), dataApi.getRawDocuments(), dataApi.getAuditLogs(),
                dataApi.getProcessingLogs(), dataApi.getPermissions(), dataApi.getRoles(),
                dataApi.getProjectWorkflows(), dataApi.getRejectionTags(), dataApi.getDocumentStatuses()
            ]);

            setClients(clientsData);
            setUsers(usersData);
            setRawProjects(projectsData);
            setRawBooks(booksData);
            setStatuses(statusesData);

            const enrichedAuditLogs = auditData
                .map(log => ({ ...log, user: usersData.find(u => u.id === log.userId)?.name || 'Unknown' }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAuditLogs(enrichedAuditLogs);

            const enrichedDocs = docsData.map(doc => ({
                ...doc,
                client: clientsData.find(c => c.id === doc.clientId)?.name || 'Unknown',
                status: statusesData.find(s => s.id === doc.statusId)?.name || 'Unknown',
                tags: doc.tags ? JSON.parse(doc.tags as any) : [],
            }));
            setDocuments(enrichedDocs);

            setProcessingLogs(processingData);
            setPermissions(permissionsData);
            setRoles(rolesData);
            setProjectWorkflows(workflowsData);
            setRejectionTags(rejectionData);

            const storedUserId = localStorage.getItem('flowvault_userid');
            if (storedUserId) {
                const user = usersData.find(u => u.id === storedUserId);
                if (user) setCurrentUser(user);
            }
        } catch (error) {
            console.error("Failed to load initial data", error);
            toast({
                title: "Error Loading Data",
                description: "Could not connect to the server. Please check your connection and refresh.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [toast]);


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
  
  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
        const response = await fetch(`/api/users/${userId}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to change password.");
        }
        
        // Optimistically update the user password in local state for subsequent logins
        // in the same session, although it's not strictly necessary.
        setUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, password: newPassword } : u
        ));

        logAction('Password Changed', `User changed their password.`, { userId: userId });
        toast({ title: "Password Changed Successfully" });
        return true;
    } catch (error: any) {
        toast({ title: "Password Change Failed", description: error.message, variant: "destructive" });
        return false;
    }
  };

  // --- Centralized Action Logger ---
  const logAction = React.useCallback(async (
    action: string, 
    details: string, 
    ids: { bookId?: string, documentId?: string, userId?: string }
  ) => {
    const actorId = ids.userId || currentUser?.id;
    if (!actorId) return;

    const mysqlDate = getDbSafeDate();

    try {
        const logData: Omit<AuditLog, 'id'> = {
            action,
            details,
            userId: actorId,
            date: mysqlDate,
            bookId: ids.bookId,
            documentId: ids.documentId,
        };
        const response = await fetch('/api/audit-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData),
        });

        if (!response.ok) {
           let errorBody: any = 'Unknown API error';
            try {
                errorBody = await response.json();
            } catch (e) {
                errorBody = await response.text();
            }
           console.error("Audit log API error:", errorBody);
           throw new Error('Failed to create audit log');
        }
        const newLog = await response.json();
        setAuditLogs(prev => [{ ...newLog, user: users.find(u => u.id === actorId)?.name || 'Unknown' }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
        console.error("Failed to save audit log:", error);
        // Optionally show a toast to the user here
    }
  }, [currentUser, users]);

  // --- Memoized Data Enrichment ---
  const allEnrichedProjects: EnrichedProject[] = React.useMemo(() => {
    return rawProjects.map(project => {
        const client = clients.find(c => c.id === project.clientId);
        
        const projectBooks = rawBooks.filter(b => b.projectId === project.id).map(book => {
            const bookDocuments = documents.filter(d => d.bookId === book.id);
            const bookProgress = book.expectedDocuments > 0 ? (bookDocuments.length / book.expectedDocuments) * 100 : 0;
            return {
                ...book,
                status: statuses.find(s => s.id === book.statusId)?.name || 'Unknown',
                clientId: project.clientId,
                projectName: project.name,
                clientName: client?.name || 'Unknown Client',
                documentCount: bookDocuments.length,
                progress: Math.min(100, bookProgress),
            };
        });

        const totalExpected = projectBooks.reduce((sum, book) => sum + book.expectedDocuments, 0);
        const documentCount = projectBooks.reduce((sum, book) => sum + book.documentCount, 0);
        const progress = totalExpected > 0 ? (documentCount / totalExpected) * 100 : 0;
  
      return {
        ...project,
        clientName: client?.name || 'Unknown Client',
        documentCount,
        totalExpected,
        progress: Math.min(100, progress),
        books: projectBooks,
      };
    });
  }, [rawProjects, clients, rawBooks, documents, statuses]);
  
  const enrichedBooks: EnrichedBook[] = React.useMemo(() => {
      return allEnrichedProjects.flatMap(p => p.books);
  }, [allEnrichedProjects]);

  const accessibleProjectsForUser = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Client' && currentUser.clientId) {
        return allEnrichedProjects.filter(p => p.clientId === currentUser.clientId);
    }
    if (OPERATOR_ROLES.includes(currentUser.role) && currentUser.projectIds?.length) {
      const operatorProjectIds = new Set(currentUser.projectIds);
      return allEnrichedProjects.filter(p => operatorProjectIds.has(p.id));
    }
    // Admin and other roles without specific project assignments see all
    return allEnrichedProjects;
  }, [allEnrichedProjects, currentUser]);

  // --- CRUD ACTIONS ---

  const addClient = async (clientData: Omit<Client, 'id'>) => {
    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData),
        });
        if (!response.ok) throw new Error('Failed to create client');
        
        const newClient = await response.json();
        
        setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
        logAction('Client Created', `New client "${newClient.name}" added.`, {});
        toast({ title: "Client Added", description: `Client "${newClient.name}" has been created.` });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not create client.", variant: "destructive" });
    }
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
    try {
        const originalClient = clients.find(c => c.id === clientId);
        const updatedClientData = { ...originalClient, ...clientData };

        const response = await fetch(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedClientData),
        });
        if (!response.ok) throw new Error('Failed to update client');
        
        const updatedClient = await response.json();
        setClients(prev => prev.map(c => c.id === clientId ? updatedClient as Client : c));
        logAction('Client Updated', `Details for "${updatedClient.name}" updated.`, {});
        toast({ title: "Client Updated", description: "Client details have been saved." });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update client.", variant: "destructive" });
    }
  };

  const deleteClient = async (clientId: string) => {
    const clientToDelete = clients.find(c => c.id === clientId);
    try {
        const response = await fetch(`/api/clients/${clientId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            if (response.status === 409) { // Conflict
                 toast({ title: "Deletion Failed", description: "Cannot delete client with associated projects. Please reassign or delete projects first.", variant: "destructive" });
                 return;
            }
            throw new Error('Failed to delete client');
        }
        
        const associatedProjectIds = rawProjects.filter(p => p.clientId === clientId).map(p => p.id);
        
        setClients(prev => prev.filter(c => c.id !== clientId));
        setRawProjects(prev => prev.filter(p => p.clientId !== clientId));
        setRawBooks(prev => prev.filter(b => !associatedProjectIds.includes(b.projectId)));
        setDocuments(prev => prev.filter(d => d.clientId !== clientId));
        setRejectionTags(prev => prev.filter(t => t.clientId !== clientId));

        if (associatedProjectIds.includes(selectedProjectId!)) {
            setSelectedProjectId(null);
        }
        logAction('Client Deleted', `Client "${clientToDelete?.name}" was deleted.`, {});
        toast({ title: "Client Deleted", description: "The client has been deleted.", variant: "destructive" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not delete client.", variant: "destructive" });
    }
  };
  
  const addUser = async (userData: UserFormValues) => {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }
        const newUser: User = await response.json();
        setUsers(prev => [...prev, newUser]);
        logAction('User Created', `New user "${newUser.name}" added with role ${newUser.role}.`, {});
        toast({ title: "User Added", description: `User "${newUser.name}" has been created.` });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not create user.", variant: "destructive" });
    }
  };

  const updateUser = async (userId: string, userData: Partial<UserFormValues>) => {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
        logAction('User Updated', `Details for user "${updatedUser.name}" updated.`, {});
        toast({ title: "User Updated" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update user.", variant: "destructive" });
    }
  };
  
  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'System') return;

    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) throw new Error('Failed to toggle user status');
        
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
        logAction('User Status Changed', `User "${user.name}" was ${newStatus}.`, {});
        toast({ title: `User ${newStatus === 'active' ? 'Enabled' : 'Disabled'}` });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update user status.", variant: "destructive" });
    }
  };

  const deleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete || userToDelete.role === 'System') return;
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        setUsers(prev => prev.filter(u => u.id !== userId));
        logAction('User Deleted', `User "${userToDelete?.name}" was deleted.`, {});
        toast({ title: "User Deleted", description: "The user has been deleted.", variant: "destructive" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not delete user.", variant: "destructive" });
    }
  };
  
  const updateUserDefaultProject = (userId: string, projectId: string | null) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, defaultProjectId: projectId || undefined } : u
    ));
    
    logAction(
        'User Default Project Set', 
        `Default project for "${user.name}" set to "${allEnrichedProjects.find(p => p.id === projectId)?.name || 'None'}".`,
        {}
    );
    toast({ title: "Default Project Updated" });
  };
  
  const addProject = async (projectData: Omit<Project, 'id'>) => {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData),
        });
        if (!response.ok) throw new Error('Failed to create project');
        
        const newProject = await response.json();
        
        setRawProjects(prev => [...prev, newProject]);
        setProjectWorkflows(prev => ({ ...prev, [newProject.id]: WORKFLOW_SEQUENCE }));

        logAction('Project Created', `New project "${newProject.name}" added.`, {});
        toast({ title: "Project Added", description: `Project "${newProject.name}" has been created.` });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not create project.", variant: "destructive" });
    }
  };
  
  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => {
    try {
        const originalProject = rawProjects.find(p => p.id === projectId);
        const updatedProjectData = { ...originalProject, ...projectData };

        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProjectData),
        });
        if (!response.ok) throw new Error('Failed to update project');
        
        const updatedProject = await response.json();
        
        setRawProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updatedProject } : p));
        logAction('Project Updated', `Details for project "${updatedProject.name}" updated.`, {});
        toast({ title: "Project Updated" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update project.", variant: "destructive" });
    }
  };

  const deleteProject = async (projectId: string) => {
      const projectToDelete = rawProjects.find(p => p.id === projectId);
      try {
          const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete project');

          if (selectedProjectId === projectId) {
              setSelectedProjectId(null);
          }
          setRawProjects(prev => prev.filter(p => p.id !== projectId));
          setRawBooks(prev => prev.filter(b => b.projectId !== projectId));
          setDocuments(prev => prev.filter(d => d.projectId !== projectId));
          setProjectWorkflows(prev => {
              const newWorkflows = { ...prev };
              delete newWorkflows[projectId];
              return newWorkflows;
          });

          logAction('Project Deleted', `Project "${projectToDelete?.name}" was deleted.`, {});
          toast({ title: "Project Deleted", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete project.", variant: "destructive" });
      }
  };

  const addBook = async (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => {
      try {
          const statusId = statuses.find(s => s.name === 'Pending Shipment')?.id;
          if (!statusId) throw new Error("Could not find 'Pending Shipment' status.");

          const response = await fetch('/api/books', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, book: {...bookData, statusId } }),
          });
          if (!response.ok) throw new Error('Failed to create book');
          const newRawBook = await response.json();
          setRawBooks(prev => [...prev, newRawBook]);
          logAction('Book Added', `Book "${newRawBook.name}" was added to project.`, { bookId: newRawBook.id });
          toast({ title: "Book Added", description: `Book "${newRawBook.name}" has been added.` });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not create book.", variant: "destructive" });
      }
  };
  
  const updateBook = async (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'statusId'>>) => {
      try {
          const response = await fetch(`/api/books/${bookId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bookData),
          });
          if (!response.ok) throw new Error('Failed to update book');
          const updatedRawBook = await response.json();
          setRawBooks(prev => prev.map(b => b.id === bookId ? updatedRawBook : b));
          logAction('Book Updated', `Details for book "${updatedRawBook.name}" were updated.`, { bookId });
          toast({ title: "Book Updated" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not update book.", variant: "destructive" });
      }
  };

  const deleteBook = async (bookId: string) => {
      const bookToDelete = rawBooks.find(b => b.id === bookId);
      try {
          const response = await fetch(`/api/books/${bookId}`, {
              method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete book');
          setRawBooks(prev => prev.filter(b => b.id !== bookId));
          setDocuments(prev => prev.filter(d => d.bookId !== bookId));
          logAction('Book Deleted', `Book "${bookToDelete?.name}" and its pages were deleted.`, { bookId });
          toast({ title: "Book Deleted", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete book.", variant: "destructive" });
      }
  };

  const importBooks = async (projectId: string, newBooks: BookImport[]) => {
      try {
          const response = await fetch('/api/books', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, books: newBooks }),
          });
          if (!response.ok) throw new Error('Failed to import books');
          const createdBooks = await response.json();
          setRawBooks(prev => [...prev, ...createdBooks]);
          logAction('Books Imported', `${createdBooks.length} books imported for project.`, {});
          toast({
              title: "Import Successful",
              description: `${createdBooks.length} books have been added to the project.`
          });
      } catch (error) {
          console.error(error);
          toast({ title: "Import Failed", description: "Could not import books.", variant: "destructive" });
      }
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
  const addRejectionTag = async (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => {
    if (!clientId) {
      toast({ title: "Client ID is missing", variant: "destructive" });
      return;
    }
    try {
        const response = await fetch('/api/rejection-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tagData, clientId }),
        });
        if (!response.ok) throw new Error('Failed to create rejection tag');
        const newTag = await response.json();
        setRejectionTags(prev => [...prev, newTag]);
        const client = clients.find(c => c.id === clientId);
        logAction('Rejection Tag Created', `Tag "${newTag.label}" created for client "${client?.name}".`, {});
        toast({ title: "Rejection Reason Added" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not create rejection reason.", variant: "destructive" });
    }
  };

  const updateRejectionTag = async (tagId: string, tagData: Partial<Omit<RejectionTag, 'id' | 'clientId'>>) => {
     try {
        const response = await fetch(`/api/rejection-tags/${tagId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tagData),
        });
        if (!response.ok) throw new Error('Failed to update rejection tag');
        const updatedTag = await response.json();
        setRejectionTags(prev => prev.map(t => t.id === tagId ? updatedTag : t));
        logAction('Rejection Tag Updated', `Tag "${updatedTag.label}" updated.`, {});
        toast({ title: "Rejection Reason Updated" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update rejection reason.", variant: "destructive" });
    }
  };

  const deleteRejectionTag = async (tagId: string) => {
    const tag = rejectionTags.find(t => t.id === tagId);
    try {
        const response = await fetch(`/api/rejection-tags/${tagId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete rejection tag');
        setRejectionTags(prev => prev.filter(t => t.id !== tagId));
        logAction('Rejection Tag Deleted', `Tag "${tag?.label}" deleted.`, {});
        toast({ title: "Rejection Reason Deleted", variant: 'destructive' });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not delete rejection reason.", variant: "destructive" });
    }
  };

  const tagPageForRejection = async (pageId: string, tags: string[]) => {
    await updateDocument(pageId, { tags });
  };
  
  const clearPageRejectionTags = async (pageId: string, tagsToKeep: string[] = []) => {
    await updateDocument(pageId, { tags: tagsToKeep });
  }
  
  const updateDocument = async (docId: string, data: Partial<AppDocument>) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    try {
        const payload: { [key: string]: any } = { ...data };
        if (payload.status) {
            payload.statusId = statuses.find(s => s.name === payload.status)?.id;
            delete payload.status;
        }

        const response = await fetch(`/api/documents/${docId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update document');
        const updatedDocData = await response.json();
        
        setDocuments(prev => prev.map(d => (d.id === docId ? { 
            ...d, 
            ...data, 
            statusId: updatedDocData.statusId,
            status: statuses.find(s => s.id === updatedDocData.statusId)?.name || d.status
        } : d)));
        
        let logDetails = `Document "${doc.name}" updated.`;
        if (data.tags) logDetails = `Tags for document "${doc.name}" updated to: ${data.tags.join(', ') || 'None'}.`;
        if (data.flag !== undefined) logDetails = `Flag for document "${doc.name}" set to ${data.flag || 'None'}.`;

        logAction('Document Updated', logDetails, { documentId: docId, bookId: doc.bookId ?? undefined });
        toast({ title: "Document Updated" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update document.", variant: "destructive" });
    }
  };

  const updateDocumentFlag = async (docId: string, flag: AppDocument['flag'], comment?: string) => {
    await updateDocument(docId, { flag, flagComment: flag ? comment : undefined });
  };
  
  const addPageToBook = async (bookId: string, position: number) => {
    const book = enrichedBooks.find(b => b.id === bookId);
    if (!book) return;

    const newPageName = `${book.name} - Page ${position} (Added)`;
    const newPageId = `doc_${book.id}_new_${Date.now()}`;
    const statusId = statuses.find(s => s.name === 'Client Rejected')?.id;
    if (!statusId) return;

    const newPage: Partial<RawDocument> = {
      id: newPageId,
      name: newPageName,
      clientId: book.clientId, 
      statusId: statusId,
      type: 'Added Page', 
      lastUpdated: getDbSafeDate(), 
      tags: ['added', 'corrected'] as any,
      projectId: book.projectId, 
      bookId: book.id, 
      flag: 'info',
      flagComment: 'This page was manually added during the correction phase.',
      imageUrl: `https://dummyimage.com/400x550/e0e0e0/5c5c5c.png&text=${encodeURIComponent(newPageName)}`
    };

    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPage),
        });
        if (!response.ok) throw new Error('Failed to add page');
        const createdPage = await response.json();

        setDocuments(prevDocs => {
          const otherPages = prevDocs.filter(p => p.bookId !== bookId);
          const bookPages = prevDocs.filter(p => p.bookId === bookId);
          bookPages.splice(position - 1, 0, { ...createdPage, client: book.clientName, status: 'Client Rejected' });
          return [...otherPages, ...bookPages];
        });
        setRawBooks(prev => prev.map(b => b.id === bookId ? { ...b, expectedDocuments: (b.expectedDocuments || 0) + 1 } : b));
        logAction('Page Added', `New page added to "${book.name}" at position ${position}.`, { bookId, documentId: newPageId });
        toast({ title: "Page Added" });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not add page.", variant: "destructive" });
    }
  }

  const deletePageFromBook = async (pageId: string, bookId: string) => {
      const page = documents.find(p => p.id === pageId);
      try {
          const response = await fetch(`/api/documents/${pageId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete page');

          setDocuments(prev => prev.filter(p => p.id !== pageId));
          setRawBooks(prev => prev.map(b => b.id === bookId ? {...b, expectedDocuments: (b.expectedDocuments || 1) - 1 } : b));
          logAction('Page Deleted', `Page "${page?.name}" was deleted from book.`, { bookId, documentId: pageId });
          toast({ title: "Page Deleted", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete page.", variant: "destructive" });
      }
  };


  // --- WORKFLOW ACTIONS ---
  const getNextEnabledStage = (currentStageKey: string, workflow: string[]): string | null => {
    const currentIndex = WORKFLOW_SEQUENCE.indexOf(currentStageKey);
    if (currentIndex === -1) return null;

    for (let i = currentIndex + 1; i < WORKFLOW_SEQUENCE.length; i++) {
        const nextStageKey = WORKFLOW_SEQUENCE[i];
        if (workflow.includes(nextStageKey)) {
            return nextStageKey;
        }
    }
    return null; // Reached end of workflow
  };

  const updateBookStatus = React.useCallback(async (bookId: string, newStatusName: string, additionalUpdates: Partial<RawBook> = {}) => {
    try {
        const statusId = statuses.find(s => s.name === newStatusName)?.id;
        if (!statusId) throw new Error(`Status ${newStatusName} not found.`);

        // Perform API calls first
        const bookResponse = await fetch(`/api/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statusId, ...additionalUpdates }),
        });
        if (!bookResponse.ok) throw new Error('Failed to update book status');

        const docResponse = await fetch('/api/documents/bulk-update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, newStatusId: statusId }),
        });
        if (!docResponse.ok) throw new Error('Failed to bulk update document statuses');
        
        const updatedBook = await bookResponse.json();
        
        // Batch state updates together
        setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
        setDocuments(prevDocs =>
          prevDocs.map(doc =>
            doc.bookId === bookId ? { ...doc, status: newStatusName, statusId } : doc
          )
        );

        return true;
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update book status.", variant: "destructive" });
        return false;
    }
  }, [toast, statuses]);
  
  const handleMarkAsShipped = (bookIds: string[]) => {
    bookIds.forEach(async bookId => {
      const success = await updateBookStatus(bookId, 'In Transit');
      if (success) {
        const book = rawBooks.find(b => b.id === bookId);
        logAction('Book Shipped', `Client marked book "${book?.name}" as shipped.`, { bookId });
      }
    });
    toast({ title: `${bookIds.length} Book(s) Marked as Shipped` });
  };

  const handleConfirmReception = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) return;

    const newStatus = 'Received';
    updateBookStatus(bookId, newStatus);
    logAction('Reception Confirmed', `Book "${book.name}" has been marked as received.`, { bookId });
    toast({ title: "Reception Confirmed" });
  };
  
  const handleSendToStorage = async (bookId: string, payload: { actualPageCount: number }) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;
    
    const project = rawProjects.find(p => p.id === book.projectId);
    if (!project) {
        toast({ title: "Error", description: `Could not find project for book "${book.name}".`, variant: "destructive" });
        return;
    }

    try {
      const response = await fetch(`/api/books/${bookId}/complete-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          actualPageCount: payload.actualPageCount,
          bookName: book.name,
          clientId: project.clientId,
          projectId: book.projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete scan via API');
      }

      const { book: updatedBook, documents: newDocuments } = await response.json();
      
      const statusId = statuses.find(s => s.name === 'Storage')?.id;
      
      setRawBooks(prev => prev.map(b => b.id === bookId ? {...updatedBook, statusId} : b));
      
      const finalEnrichedDocs = newDocuments.map((doc: any) => ({
          ...doc,
          client: clients.find(c => c.id === doc.clientId)?.name || 'Unknown',
          status: 'Storage',
          tags: doc.tags ? JSON.parse(doc.tags as any) : [],
      }));

      setDocuments(prev => [...prev.filter(d => d.bookId !== bookId), ...finalEnrichedDocs]);
      
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name || 'Unknown';
      const logMessage = findStageKeyFromStatus(currentStatusName) === 'already-received' ? 'Reception & Scan Skipped' : 'Scanning Finished';
      logAction(logMessage, `${payload.actualPageCount} pages created. Book "${book.name}" moved to Storage.`, { bookId });
      toast({ title: "Task Complete", description: `Book moved to Storage.` });

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not complete the process.", variant: "destructive" });
    }
  };


  const handleMoveBookToNextStage = (bookId: string, currentStatusName: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) return;

    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(currentStatusName);
    
    if (!currentStageKey) {
        toast({title: "Workflow Error", description: `Cannot find workflow stage for status "${currentStatusName}".`, variant: "destructive"});
        return;
    }
    
    const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
    if (!nextStageKey) {
      toast({title: "Workflow Complete", description: "This is the final step for this project."});
      updateBookStatus(bookId, 'Complete', {});
      logAction('Workflow End', `Book "${book.name}" has completed the workflow.`, { bookId });
      return;
    }
    
    const nextStageConfig = STAGE_CONFIG[nextStageKey];
    const newStatusName = nextStageConfig.dataStatus || nextStageConfig.dataStage;
    
    if (!newStatusName) {
        toast({title: "Workflow Error", description: `Next stage "${nextStageKey}" has no configured status.`, variant: "destructive"});
        return;
    }
    
    const additionalUpdates: Partial<RawBook> = {};
    if (currentStatusName === 'Scanning Started') {
        additionalUpdates.scanEndTime = getDbSafeDate();
    }
    if (currentStatusName === 'Indexing Started') {
        additionalUpdates.indexingEndTime = getDbSafeDate();
        if(!book.indexingStartTime) additionalUpdates.indexingStartTime = getDbSafeDate(); // Defensive
    }
    if (currentStatusName === 'Checking Started') {
        additionalUpdates.qcEndTime = getDbSafeDate();
        if(!book.qcStartTime) additionalUpdates.qcStartTime = getDbSafeDate();
    }
    
    updateBookStatus(bookId, newStatusName, additionalUpdates);
    logAction('Workflow Step', `Book "${book.name}" moved from ${currentStatusName} to ${newStatusName}.`, { bookId });
    toast({ title: "Workflow Action", description: `Book moved to ${newStatusName}.` });
  };

  const handleAssignUser = async (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => {
    const user = users.find(u => u.id === userId);
    const book = rawBooks.find(b => b.id === bookId);
    if (!user || !book || !book.projectId) return;
    
    const workflow = projectWorkflows[book.projectId] || [];
    
    let currentStageKey: string | null = null;
    let nextStatusKey: string | null = null;
    let newStatusName: string = '';
    let logMsg = '';
    let updates: Partial<RawBook> = {};
    
    const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
    if (!currentStatusName) return;

    currentStageKey = findStageKeyFromStatus(currentStatusName);
    if (!currentStageKey) return;

    nextStatusKey = getNextEnabledStage(currentStageKey, workflow);
    
    if (role === 'scanner') {
        newStatusName = STAGE_CONFIG[nextStatusKey || 'to-scan']?.dataStatus || 'To Scan';
        updates.scannerUserId = userId;
        logMsg = 'Assigned to Scanner';
    } else if (role === 'indexer') {
        newStatusName = STAGE_CONFIG[nextStatusKey || 'to-indexing']?.dataStatus || 'To Indexing';
        updates.indexerUserId = userId;
        logMsg = 'Assigned to Indexer';
    } else if (role === 'qc') {
        newStatusName = STAGE_CONFIG[nextStatusKey || 'to-checking']?.dataStatus || 'To Checking';
        updates.qcUserId = userId;
        updates.indexingEndTime = getDbSafeDate();
        if(!book.indexingStartTime) updates.indexingStartTime = getDbSafeDate();
        logMsg = 'Assigned for QC';
    }
    
    if (newStatusName) {
      await updateBookStatus(bookId, newStatusName, updates);
      logAction(logMsg, `Book "${book.name}" assigned to ${user.name}.`, { bookId });
      toast({ title: "Book Assigned", description: `Assigned to ${user.name} for ${role}.` });
    }
  };

  const reassignUser = (bookId: string, newUserId: string, role: 'scanner' | 'indexer' | 'qc') => {
    const book = rawBooks.find(b => b.id === bookId);
    const newUser = users.find(u => u.id === newUserId);
    if (!book || !newUser) return;

    let updateField: 'scannerUserId' | 'indexerUserId' | 'qcUserId' = `${role}UserId`;
    
    updateBook(bookId, { [updateField]: newUserId });
    
    const oldUser = users.find(u => u.id === book[updateField]);
    
    logAction(
      'User Reassigned', 
      `Task for book "${book.name}" was reassigned from ${oldUser?.name || 'Unassigned'} to ${newUser.name}.`, 
      { bookId }
    );
    toast({ title: "User Reassigned", description: `${newUser.name} is now responsible for this task.` });
  };


  const handleStartTask = (bookId: string, role: 'scanner' | 'indexing' | 'qc') => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) return;

    const workflow = projectWorkflows[book.projectId] || [];
    
    let currentStageKey: string | null = null;
    let nextStatusKey: string | null = null;
    let newStatusName: string = '';
    let logMsg = '';
    let updates: Partial<RawBook> = {};
    
    const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
    if (!currentStatusName) return;
    
    currentStageKey = findStageKeyFromStatus(currentStatusName);
    if (!currentStageKey) return;

    nextStatusKey = getNextEnabledStage(currentStageKey, workflow);
    
    if (role === 'scanner') {
        newStatusName = STAGE_CONFIG[nextStatusKey || 'scanning-started']?.dataStatus || 'Scanning Started';
        updates.scanStartTime = getDbSafeDate();
        logMsg = 'Scanning Started';
    } else if (role === 'indexing') {
        newStatusName = STAGE_CONFIG[nextStatusKey || 'indexing-started']?.dataStatus || 'Indexing Started';
        updates.indexingStartTime = getDbSafeDate();
        logMsg = 'Indexing Started';
    } else if (role === 'qc') {
        newStatusName = STAGE_CONFIG[nextStatusKey || 'checking-started']?.dataStatus || 'Checking Started';
        updates.qcStartTime = getDbSafeDate();
        logMsg = 'Checking Started';
    }
    
    if (newStatusName) {
      updateBookStatus(bookId, newStatusName, updates);
      logAction(logMsg, `${logMsg} process initiated for book.`, { bookId });
      toast({ title: logMsg });
    }
  };

  const handleCancelTask = (bookId: string, currentStatusId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;
    const currentStatusName = statuses.find(s => s.id === currentStatusId)?.name;
    if (!currentStatusName) return;

    const updates: { [key: string]: { bookStatus: string, logMsg: string, clearFields: Partial<RawBook> } } = {
      'Scanning Started': { bookStatus: 'To Scan', logMsg: 'Scanning', clearFields: { scanStartTime: undefined } },
      'Indexing Started': { bookStatus: 'To Indexing', logMsg: 'Indexing', clearFields: { indexingStartTime: undefined } },
      'Checking Started': { bookStatus: 'To Checking', logMsg: 'Checking', clearFields: { qcStartTime: undefined } },
    };

    const updateKey = Object.keys(updates).find(key => currentStatusName.startsWith(key));
    if (!updateKey) return;
    const update = updates[updateKey];
    
    updateBookStatus(bookId, update.bookStatus, update.clearFields);
    logAction('Task Cancelled', `${update.logMsg} for book "${book.name}" was cancelled.`, { bookId });
    toast({ title: 'Task Cancelled', description: `Book returned to ${update.bookStatus} Queue.`, variant: 'destructive' });
  };
  
  const handleAdminStatusOverride = (bookId: string, newStatusName: string, reason: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    const newStatus = statuses.find(s => s.name === newStatusName);
    if (!book || !newStatus) return;

    const newStageKey = findStageKeyFromStatus(newStatus.name);
    const newStageConfig = newStageKey ? STAGE_CONFIG[newStageKey] : null;

    const updates: Partial<RawBook> = {};
    if (newStageConfig?.assigneeRole !== 'scanner') {
        updates.scannerUserId = undefined; updates.scanStartTime = undefined; updates.scanEndTime = undefined;
    }
    if (newStageConfig?.assigneeRole !== 'indexer') {
        updates.indexerUserId = undefined; updates.indexingStartTime = undefined; updates.indexingEndTime = undefined;
    }
    if (newStageConfig?.assigneeRole !== 'qc') {
        updates.qcUserId = undefined; updates.qcStartTime = undefined; updates.qcEndTime = undefined;
    }

    updateBookStatus(bookId, newStatus.name, updates);

    logAction(
        'Admin Status Override', 
        `Status of "${book.name}" manually changed to "${newStatus.name}". Reason: ${reason}`,
        { bookId }
    );
    toast({ title: "Status Overridden", description: `Book is now in status: ${newStatus.name}` });
  };


  const handleStartProcessing = async (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) return;
    const workflow = projectWorkflows[book.projectId] || [];
    const nextStage = getNextEnabledStage('ready-for-processing', workflow) || 'in-processing';
    const newStatus = STAGE_CONFIG[nextStage]?.dataStatus || STAGE_CONFIG[nextStage]?.dataStage || 'In Processing';

    try {
        const response = await fetch('/api/processing-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId }),
        });
        if (!response.ok) throw new Error('Failed to start processing log');
        const newLog = await response.json();
        setProcessingLogs(prev => [...prev.filter(l => l.bookId !== bookId), newLog]);
        await updateBookStatus(bookId, newStatus);
        logAction('Processing Started', `Automated processing started for book "${book?.name}".`, { bookId });
        toast({ title: 'Processing Started' });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not start processing.", variant: "destructive" });
    }
  };
  
  const handleCompleteProcessing = async (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    const log = processingLogs.find(l => l.bookId === bookId);
    if (!book || !book.projectId || !log) return;
    const workflow = projectWorkflows[book.projectId] || [];
    const nextStage = getNextEnabledStage('in-processing', workflow) || 'processed';
    const newStatus = STAGE_CONFIG[nextStage]?.dataStatus || STAGE_CONFIG[nextStage]?.dataStage || 'Processed';
    
    try {
        const updatedLogData = { 
            status: 'Complete', 
            progress: 100, 
            log: `${log.log}\n[${new Date().toLocaleTimeString()}] Processing complete.`,
            lastUpdate: getDbSafeDate(),
        };
        const response = await fetch(`/api/processing-logs/${log.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedLogData),
        });
        if (!response.ok) throw new Error('Failed to update processing log');

        setProcessingLogs(prev => prev.map(l => l.id === log.id ? { ...l, ...updatedLogData } : l));
        await updateBookStatus(bookId, newStatus);
        logAction('Processing Completed', `Automated processing finished for book "${book?.name}".`, { bookId });
        toast({ title: 'Processing Complete' });

    } catch (error) {
         console.error(error);
        toast({ title: "Error", description: "Could not complete processing.", variant: "destructive" });
    }
  };

  const handleClientAction = (bookId: string, action: 'approve' | 'reject', reason?: string) => {
    const book = enrichedBooks.find(b => b.id === bookId);
    if (!book) return;

    const isApproval = action === 'approve';
    const newStatus = isApproval ? 'Finalized' : 'Client Rejected';
    
    updateBookStatus(bookId, newStatus, { rejectionReason: isApproval ? undefined : reason });
    
    logAction(
      `Client ${isApproval ? 'Approval' : 'Rejection'}`, 
      isApproval ? `Book "${book?.name}" approved.` : `Book "${book?.name}" rejected. Reason: ${reason}`,
      { bookId }
    );

    toast({ title: `Book ${isApproval ? 'Approved' : 'Rejected'}` });
  };

  const handleFinalize = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) return;
    const workflow = projectWorkflows[book.projectId] || [];
    const nextStageKey = getNextEnabledStage('finalized', workflow) || 'archive';
    const newStatus = STAGE_CONFIG[nextStageKey]?.dataStatus || STAGE_CONFIG[nextStageKey]?.dataStage || 'Archived';
    
    updateBookStatus(bookId, newStatus);
    logAction('Book Archived', `Book "${book?.name}" was finalized and moved to ${newStatus}.`, { bookId });
    toast({ title: "Book Archived" });
  };
  
  const handleMarkAsCorrected = (bookId: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) return;
    const workflow = projectWorkflows[book.projectId] || [];
    const nextStageKey = getNextEnabledStage('client-rejections', workflow) || 'corrected';
    const newStatus = STAGE_CONFIG[nextStageKey]?.dataStatus || STAGE_CONFIG[nextStageKey]?.dataStage || 'Corrected';

    updateBookStatus(bookId, newStatus);
    logAction('Marked as Corrected', `Book "${book.name}" marked as corrected after client rejection.`, { bookId });
    toast({ title: "Book Corrected" });
  };

  const handleResubmit = (bookId: string, targetStage: string) => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book) return;
    updateBookStatus(bookId, targetStage);
    logAction('Book Resubmitted', `Book "${book?.name}" resubmitted to ${targetStage}.`, { bookId });
    toast({ title: "Book Resubmitted" });
  };
  
  const updateDocumentStatus = async (docId: string, newStatus: string) => {
    const statusId = statuses.find(s => s.name === newStatus)?.id;
    if (!statusId) return;
    
    await updateDocument(docId, { statusId: statusId });
  };

  const scannerUsers = React.useMemo(() => users.filter(user => user.role === 'Scanning'), [users]);
  const indexerUsers = React.useMemo(() => users.filter(user => user.role === 'Indexing'), [users]);
  const qcUsers = React.useMemo(() => users.filter(user => user.role === 'QC Specialist'), [users]);

  // --- Contextual Data Filtering ---
  const projectsForContext = React.useMemo(() => {
    if (!selectedProjectId) return [];
    return allEnrichedProjects.filter(p => p.id === selectedProjectId);
  }, [allEnrichedProjects, selectedProjectId]);
  
  const booksForContext = React.useMemo(() => {
    if (!selectedProjectId) return [];
    const project = allEnrichedProjects.find(p => p.id === selectedProjectId);
    return project ? project.books : [];
  }, [allEnrichedProjects, selectedProjectId]);

  const documentsForContext = React.useMemo(() => {
    if (!selectedProjectId) return [];
    const booksForContextIds = new Set(booksForContext.map(b => b.id));
    return documents.filter(d => d.bookId && booksForContextIds.has(d.bookId));
  }, [documents, booksForContext, selectedProjectId]);


  const value: AppContextType = { 
    loading,
    currentUser, login, logout, changePassword,
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
    allProjects: allEnrichedProjects, // Expose all projects for Admin user selection
    accessibleProjectsForUser,
    selectedProjectId,
    setSelectedProjectId,
    addClient, updateClient, deleteClient,
    addUser, updateUser, deleteUser, toggleUserStatus, updateUserDefaultProject,
    addRole, updateRole, deleteRole,
    addProject, updateProject, deleteProject,
    updateProjectWorkflow,
    addBook, updateBook, deleteBook, importBooks,
    addRejectionTag, updateRejectionTag, deleteRejectionTag,
    tagPageForRejection, clearPageRejectionTags,
    getNextEnabledStage,
    handleMarkAsShipped,
    handleConfirmReception,
    handleSendToStorage,
    handleMoveBookToNextStage, handleClientAction,
    handleFinalize, handleMarkAsCorrected, handleResubmit,
    addPageToBook, deletePageFromBook, updateDocumentStatus,
    updateDocumentFlag, handleStartProcessing, handleCompleteProcessing,
    handleAssignUser, reassignUser, handleStartTask, handleCancelTask,
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
