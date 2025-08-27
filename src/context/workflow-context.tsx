

"use client"

import * as React from 'react';
import type { Client, User, Project, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog, ProcessingLog, Permissions, ProjectWorkflows, RejectionTag, DocumentStatus, ProcessingBatch, ProcessingBatchItem, Storage, LogTransferencia, ProjectStorage, Scanner, DeliveryBatch, DeliveryBatchItem } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { WORKFLOW_SEQUENCE, STAGE_CONFIG, findStageKeyFromStatus, getNextEnabledStage } from '@/lib/workflow-config';
import * as dataApi from '@/lib/data';
import { UserFormValues } from '@/app/(app)/users/user-form';
import { StorageFormValues } from '@/app/(app)/admin/general-configs/storage-form';
import { ScannerFormValues } from '@/app/(app)/admin/general-configs/scanner-form';

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
export type AppDocument = Omit<RawDocument, 'statusId'> & { client: string; status: string; };
export type EnrichedAuditLog = AuditLog & { user: string; };
export type NavigationHistoryItem = { href: string, label: string };

type AppContextType = {
  // Loading state
  loading: boolean;
  isMutating: boolean;
  setIsMutating: React.Dispatch<React.SetStateAction<boolean>>;
  processingBookIds: string[];
  
  // Auth state
  currentUser: User | null;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean>;

  // Navigation History
  navigationHistory: NavigationHistoryItem[];
  addNavigationHistoryItem: (item: NavigationHistoryItem) => void;

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
  processingBatches: ProcessingBatch[];
  processingBatchItems: ProcessingBatchItem[];
  processingLogs: ProcessingLog[];
  deliveryBatches: DeliveryBatch[];
  deliveryBatchItems: DeliveryBatchItem[];
  roles: string[];
  permissions: Permissions;
  projectWorkflows: ProjectWorkflows;
  projectStorages: ProjectStorage[];
  rejectionTags: RejectionTag[];
  storages: Storage[];
  scanners: Scanner[];
  statuses: DocumentStatus[];
  rawBooks: RawBook[];
  
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
  updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
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

  // Storage, Scanner & Project-Storage Actions
  addStorage: (storageData: StorageFormValues) => Promise<void>;
  updateStorage: (storageId: string, storageData: StorageFormValues) => Promise<void>;
  deleteStorage: (storageId: string) => Promise<void>;
  addScanner: (scannerData: ScannerFormValues) => Promise<void>;
  updateScanner: (scannerId: number, scannerData: ScannerFormValues) => Promise<void>;
  deleteScanner: (scannerId: number) => Promise<void>;
  addProjectStorage: (associationData: ProjectStorage) => Promise<void>;
  updateProjectStorage: (associationData: ProjectStorage) => Promise<void>;
  deleteProjectStorage: (projectId: string, storageId: number) => Promise<void>;

  // Workflow Actions
  getNextEnabledStage: (currentStage: string, workflow: string[]) => string | null;
  handleMarkAsShipped: (bookIds: string[]) => void;
  handleConfirmReception: (bookId: string) => void;
  handleSendToStorage: (bookId: string, payload: { actualPageCount: number }) => void;
  handleMoveBookToNextStage: (bookId: string, currentStatus: string) => Promise<boolean>;
  handleAssignUser: (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => void;
  reassignUser: (bookId: string, newUserId: string, role: 'scanner' | 'indexer' | 'qc') => void;
  handleStartTask: (bookId: string, role: 'scanner' | 'indexing' | 'qc') => void;
  handleCompleteTask: (bookId: string, stage: string) => void;
  handleCancelCompleteTask: (bookId: string, stage: string) => void;
  handleCancelTask: (bookId: string, currentStatus: string) => void;
  handleAdminStatusOverride: (bookId: string, newStatusName: string, reason: string) => void;
  startProcessingBatch: (bookIds: string[], storageId: string) => void;
  failureProcessingBatch: (batchId: string, storageId: string) => void;
  completeProcessingBatch: (batchId: string) => void;
  handleSendBatchToNextStage: (batchIds: string[]) => Promise<void>;
  setProvisionalDeliveryStatus: (deliveryItemId: string, bookId: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  approveBatch: (deliveryId: string) => void;
  handleFinalize: (bookId: string) => void;
  handleMarkAsCorrected: (bookId: string) => void;
  handleResubmit: (bookId: string, targetStage: string) => void;
  handleCreateDeliveryBatch: (bookIds: string[]) => Promise<void>;
  finalizeDeliveryBatch: (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => Promise<void>;
  distributeValidationSample: (batchId: string, assignments: { itemId: string; userId: string }[]) => Promise<void>;
  addPageToBook: (bookId: string, position: number) => Promise<void>;
  deletePageFromBook: (pageId: string, bookId: string) => Promise<void>;
  updateDocumentFlag: (docId: string, flag: AppDocument['flag'], comment?: string) => Promise<void>;
  handlePullNextTask: (currentStage: string, userIdToAssign?: string) => Promise<void>;
  logAction: (action: string, details: string, ids: { bookId?: string; documentId?: string; userId?: string; }) => Promise<void>;
  moveBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
  updateBookStatus: (bookId: string, newStatusName: string, additionalUpdates?: Partial<EnrichedBook>) => Promise<any>;
  setRawBooks: React.Dispatch<React.SetStateAction<RawBook[]>>;
  setDeliveryBatches: React.Dispatch<React.SetStateAction<DeliveryBatch[]>>;
  setDeliveryBatchItems: React.Dispatch<React.SetStateAction<DeliveryBatchItem[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<EnrichedAuditLog[]>>;
  setProcessingBatchItems: React.Dispatch<React.SetStateAction<ProcessingBatchItem[]>>;
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

const OPERATOR_ROLES = ["Operator", "QC Specialist", "Reception", "Scanning", "Indexing", "Processing", "Delivery", "Correction Specialist", "Multi-Operator", "Supervisor"];

const getDbSafeDate = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const openLocalApp = (protocol: string, data: Record<string, string>) => {
  const queryString = new URLSearchParams(data).toString();
  const url = `${protocol}://start?${queryString}`;
  // Use a timeout to avoid blocking the UI thread if the protocol is not handled.
  setTimeout(() => {
    window.location.href = url;
  }, 100);
};

export function AppProvider({ children }: { children: React.ReactNode; }) {
  const [loading, setLoading] = React.useState(true);
  const [isMutating, setIsMutating] = React.useState(false);
  const [processingBookIds, setProcessingBookIds] = React.useState<string[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [rawProjects, setRawProjects] = React.useState<Project[]>([]);
  const [rawBooks, setRawBooks] = React.useState<RawBook[]>([]);
  const [rawDocuments, setRawDocuments] = React.useState<RawDocument[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<EnrichedAuditLog[]>([]);
  const [processingBatches, setProcessingBatches] = React.useState<ProcessingBatch[]>([]);
  const [processingBatchItems, setProcessingBatchItems] = React.useState<ProcessingBatchItem[]>([]);
  const [processingLogs, setProcessingLogs] = React.useState<ProcessingLog[]>([]);
  const [deliveryBatches, setDeliveryBatches] = React.useState<DeliveryBatch[]>([]);
  const [deliveryBatchItems, setDeliveryBatchItems] = React.useState<DeliveryBatchItem[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<Permissions>({});
  const [projectWorkflows, setProjectWorkflows] = React.useState<ProjectWorkflows>({});
  const [rejectionTags, setRejectionTags] = React.useState<RejectionTag[]>([]);
  const [statuses, setStatuses] = React.useState<DocumentStatus[]>([]);
  const [storages, setStorages] = React.useState<Storage[]>([]);
  const [scanners, setScanners] = React.useState<Scanner[]>([]);
  const [projectStorages, setProjectStorages] = React.useState<ProjectStorage[]>([]);
  const [transferLogs, setTransferLogs] = React.useState<LogTransferencia[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = React.useState<NavigationHistoryItem[]>([]);
  const { toast } = useToast();
  
  const withMutation = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setIsMutating(true);
    try {
        const result = await action();
        return result;
    } catch (error: any) {
        console.error("A mutation failed:", error);
        toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsMutating(false);
    }
  };
  
  React.useEffect(() => {
    const loadData = async () => {
        try {
            setLoading(true);
            const [
                clientsData, usersData, projectsData, booksData, 
                docsData, auditData, batchesData, batchItemsData, logsData,
                permissionsData, rolesData, workflowsData, rejectionData, statusesData,
                storagesData, scannersData, transferLogsData, projectStoragesData,
                deliveryBatchesData, deliveryBatchItemsData,
            ] = await Promise.all([
                dataApi.getClients(), dataApi.getUsers(), dataApi.getRawProjects(),
                dataApi.getRawBooks(), dataApi.getRawDocuments(), dataApi.getAuditLogs(),
                dataApi.getProcessingBatches(), dataApi.getProcessingBatchItems(), dataApi.getProcessingLogs(),
                dataApi.getPermissions(), dataApi.getRoles(),
                dataApi.getProjectWorkflows(), dataApi.getRejectionTags(), dataApi.getDocumentStatuses(),
                dataApi.getStorages(), dataApi.getScanners(), dataApi.getTransferLogs(), dataApi.getProjectStorages(),
                dataApi.getDeliveryBatches(), dataApi.getDeliveryBatchItems(),
            ]);

            setClients(clientsData);
            setUsers(usersData);
            setRawProjects(projectsData);
            setRawBooks(booksData);
            setStatuses(statusesData);
            setRawDocuments(docsData);
            setStorages(storagesData);
            setScanners(scannersData);
            setTransferLogs(transferLogsData);
            setProjectStorages(projectStoragesData);

            const enrichedAuditLogs = auditData
                .map(log => ({ ...log, user: usersData.find(u => u.id === log.userId)?.name || 'Unknown' }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAuditLogs(enrichedAuditLogs);

            setProcessingBatches(batchesData);
            setProcessingBatchItems(batchItemsData);
            setProcessingLogs(logsData);
            setDeliveryBatches(deliveryBatchesData);
            setDeliveryBatchItems(deliveryBatchItemsData);
            setPermissions(permissionsData);
            setRoles(rolesData);
            setProjectWorkflows(workflowsData);
            setRejectionTags(rejectionData);

            const storedUserId = localStorage.getItem('flowvault_userid');
            if (storedUserId) {
                const user = usersData.find(u => u.id === storedUserId);
                if (user) {
                  setCurrentUser(user);
                  const storedHistory = localStorage.getItem(`nav_history_${user.id}`);
                  if(storedHistory) {
                    setNavigationHistory(JSON.parse(storedHistory));
                  }
                }
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
      setSelectedProjectId(null);
      setCurrentUser(user);
      localStorage.setItem('flowvault_userid', user.id);
      const storedHistory = localStorage.getItem(`nav_history_${user.id}`);
      if(storedHistory) {
        setNavigationHistory(JSON.parse(storedHistory));
      } else {
        setNavigationHistory([]);
      }
      return user;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    setNavigationHistory([]);
    localStorage.removeItem('flowvault_userid');
  };
  
  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    return withMutation(async () => {
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
    }) ?? false;
  };
  
  const addNavigationHistoryItem = React.useCallback((item: NavigationHistoryItem) => {
    if(!currentUser) return;
    setNavigationHistory(prev => {
        const newHistory = [item, ...prev.filter(p => p.href !== item.href)].slice(0, 5);
        localStorage.setItem(`nav_history_${currentUser.id}`, JSON.stringify(newHistory));
        return newHistory;
    });
  }, [currentUser]);

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
    }
  }, [currentUser, users]);

  const documents: AppDocument[] = React.useMemo(() => {
    return rawDocuments.map(doc => {
        const book = rawBooks.find(b => b.id === doc.bookId);
        const bookStatus = statuses.find(s => s.id === book?.statusId)?.name || 'Unknown';
        let parsedTags: string[] = [];
        if (doc.tags && typeof doc.tags === 'string' && doc.tags.trim() !== '') {
            try {
                parsedTags = JSON.parse(doc.tags);
            } catch (e) {
                parsedTags = [];
            }
        } else if (doc.tags && Array.isArray(doc.tags)) {
            parsedTags = doc.tags;
        }
        return {
            ...doc,
            client: clients.find(c => c.id === doc.clientId)?.name || 'Unknown',
            status: bookStatus,
            tags: parsedTags,
        };
    });
  }, [rawDocuments, rawBooks, statuses, clients]);

  const allEnrichedProjects: EnrichedProject[] = React.useMemo(() => {
    const storageMap = new Map(storages.map(s => [s.id, s.nome]));
    const scannerDeviceMap = new Map(scanners.map(s => [s.id, s.nome]));
    const bookInfoMap = new Map<string, { storageName?: string, storageId?: string, scannerDeviceName?: string }>();

    transferLogs.forEach(log => {
      if (log.bookId && log.status === 'sucesso') {
          const currentInfo = bookInfoMap.get(log.bookId) || {};
          if (storageMap.has(Number(log.storage_id))) {
              currentInfo.storageName = storageMap.get(Number(log.storage_id))!;
              currentInfo.storageId = log.storage_id;
          }
           if (scannerDeviceMap.has(Number(log.scanner_id))) {
              currentInfo.scannerDeviceName = scannerDeviceMap.get(Number(log.scanner_id))!;
          }
          bookInfoMap.set(log.bookId, currentInfo);
      }
    });
  
    return rawProjects.map(project => {
        const client = clients.find(c => c.id === project.clientId);
        
        const projectBooks = rawBooks.filter(b => b.projectId === project.id).map(book => {
            const bookDocuments = rawDocuments.filter(d => d.bookId === book.id);
            const bookProgress = book.expectedDocuments > 0 ? (bookDocuments.length / book.expectedDocuments) * 100 : 0;
            const extraInfo = bookInfoMap.get(book.id);
            return {
                ...book,
                status: statuses.find(s => s.id === book.statusId)?.name || 'Unknown',
                clientId: project.clientId,
                projectName: project.name,
                clientName: client?.name || 'Unknown Client',
                documentCount: bookDocuments.length,
                progress: Math.min(100, bookProgress),
                storageName: extraInfo?.storageName,
                storageId: extraInfo?.storageId,
                scannerDeviceName: extraInfo?.scannerDeviceName,
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
  }, [rawProjects, clients, rawBooks, rawDocuments, statuses, storages, transferLogs, users, scanners]);
  
  const enrichedBooks: EnrichedBook[] = React.useMemo(() => {
      return allEnrichedProjects.flatMap(p => p.books);
  }, [allEnrichedProjects]);

  const accessibleProjectsForUser = React.useMemo(() => {
    if (!currentUser) return [];
    
    // Any user with a clientId (Client, Client Manager, Client Operator) sees projects for that client.
    if (currentUser.clientId) {
      return allEnrichedProjects.filter(p => p.clientId === currentUser.clientId);
    }
    
    // Internal operators with specific project assignments see only those.
    if (OPERATOR_ROLES.includes(currentUser.role) && currentUser.projectIds?.length) {
      const operatorProjectIds = new Set(currentUser.projectIds);
      return allEnrichedProjects.filter(p => operatorProjectIds.has(p.id));
    }
    
    // Admins or operators with no specific project assignments see all projects.
    return allEnrichedProjects;
  }, [allEnrichedProjects, currentUser]);


  const addClient = async (clientData: Omit<Client, 'id'>) => {
    await withMutation(async () => {
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
    });
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
    await withMutation(async () => {
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
    });
  };

  const deleteClient = async (clientId: string) => {
    await withMutation(async () => {
      const clientToDelete = clients.find(c => c.id === clientId);
      try {
          const response = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
          if (!response.ok) {
              if (response.status === 409) {
                   toast({ title: "Deletion Failed", description: "Cannot delete client with associated projects. Please reassign or delete projects first.", variant: "destructive" });
                   return;
              }
              throw new Error('Failed to delete client');
          }
          
          const associatedProjectIds = rawProjects.filter(p => p.clientId === clientId).map(p => p.id);
          
          setClients(prev => prev.filter(c => c.id !== clientId));
          setRawProjects(prev => prev.filter(p => p.clientId !== clientId));
          setRawBooks(prev => prev.filter(b => !associatedProjectIds.includes(b.projectId)));
          setRawDocuments(prev => prev.filter(d => d.clientId !== clientId));
          setRejectionTags(prev => prev.filter(t => t.clientId !== clientId));

          if (associatedProjectIds.includes(selectedProjectId!)) setSelectedProjectId(null);
          logAction('Client Deleted', `Client "${clientToDelete?.name}" was deleted.`, {});
          toast({ title: "Client Deleted", description: "The client has been deleted.", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete client.", variant: "destructive" });
      }
    });
  };
  
  const addUser = async (userData: UserFormValues) => {
    await withMutation(async () => {
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
    });
  };

  const updateUser = async (userId: string, userData: Partial<User>) => {
    await withMutation(async () => {
      try {
          const response = await fetch(`/api/users/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData),
          });
          if (!response.ok) throw new Error('Failed to update user');
          const updatedUser = await response.json();
          setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
          logAction('User Updated', `Details for user "${updatedUser.name}" updated.`, {});
          toast({ title: "User Updated" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not update user.", variant: "destructive" });
      }
    });
  };
  
  const toggleUserStatus = async (userId: string) => {
    await withMutation(async () => {
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
    });
  };

  const deleteUser = async (userId: string) => {
    await withMutation(async () => {
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete || userToDelete.role === 'System') return;
      try {
          const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete user');
          setUsers(prev => prev.filter(u => u.id !== userId));
          logAction('User Deleted', `User "${userToDelete?.name}" was deleted.`, {});
          toast({ title: "User Deleted", description: "The user has been deleted.", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete user.", variant: "destructive" });
      }
    });
  };
  
  const updateUserDefaultProject = (userId: string, projectId: string | null) => {
    withMutation(async () => {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultProjectId: projectId }),
        });
        if (!response.ok) throw new Error("Failed to update user's default project.");
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser);
        }
        logAction('Default Project Set', `Default project for user ${updatedUser.name} set.`, {});
        toast({ title: "Default Project Updated" });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };
  
  const addProject = async (projectData: Omit<Project, 'id'>) => {
    await withMutation(async () => {
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
    });
  };
  
  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => {
    await withMutation(async () => {
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
    });
  };

  const deleteProject = async (projectId: string) => {
    await withMutation(async () => {
        const projectToDelete = rawProjects.find(p => p.id === projectId);
        try {
            const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete project');
            if (selectedProjectId === projectId) setSelectedProjectId(null);
            setRawProjects(prev => prev.filter(p => p.id !== projectId));
            setRawBooks(prev => prev.filter(b => b.projectId !== projectId));
            setRawDocuments(prev => prev.filter(d => d.projectId !== projectId));
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
    });
  };

  const addBook = async (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => {
      await withMutation(async () => {
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
      });
  };
  
  const updateBook = async (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'statusId'>>) => {
      await withMutation(async () => {
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
      });
  };

  const deleteBook = async (bookId: string) => {
      await withMutation(async () => {
        const bookToDelete = rawBooks.find(b => b.id === bookId);
        try {
            const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete book');
            setRawBooks(prev => prev.filter(b => b.id !== bookId));
            setRawDocuments(prev => prev.filter(d => d.bookId !== bookId));
            logAction('Book Deleted', `Book "${bookToDelete?.name}" and its pages were deleted.`, { bookId });
            toast({ title: "Book Deleted", variant: "destructive" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not delete book.", variant: "destructive" });
        }
      });
  };

  const importBooks = async (projectId: string, newBooks: BookImport[]) => {
      await withMutation(async () => {
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
      });
  };

  const addRole = (roleName: string, rolePermissions: string[]) => {
    withMutation(async () => {
      if (roles.includes(roleName)) {
        toast({ title: "Role Exists", description: "A role with this name already exists.", variant: "destructive" });
        return;
      }
      setRoles(prev => [...prev, roleName]);
      setPermissions(prev => ({...prev, [roleName]: rolePermissions }));
      logAction('Role Created', `New role "${roleName}" was created.`, {});
      toast({ title: "Role Created", description: `Role "${roleName}" has been added.` });
    });
  };

  const updateRole = (roleName: string, rolePermissions: string[]) => {
    withMutation(async () => {
      try {
        const response = await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: roleName, permissions: rolePermissions }),
        });
        if (!response.ok) {
          throw new Error('Failed to save permissions to the database.');
        }
        setPermissions(prev => ({ ...prev, [roleName]: rolePermissions }));
        logAction('Role Updated', `Permissions for role "${roleName}" were updated.`, {});
        toast({ title: "Role Updated", description: `Permissions for "${roleName}" have been saved.` });
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update role permissions.", variant: "destructive" });
      }
    });
  };
  
  const deleteRole = (roleName: string) => {
    withMutation(async () => {
      setRoles(prev => prev.filter(r => r !== roleName));
      setPermissions(prev => {
        const newPerms = { ...prev };
        delete newPerms[roleName];
        return newPerms;
      });
      setUsers(prev => prev.map(u => u.role === roleName ? { ...u, role: '' } : u));
      logAction('Role Deleted', `Role "${roleName}" was deleted.`, {});
      toast({ title: "Role Deleted", description: `Role "${roleName}" has been deleted.`, variant: "destructive" });
    });
  };

  const updateProjectWorkflow = (projectId: string, workflow: string[]) => {
    withMutation(async () => {
      try {
        const response = await fetch(`/api/project-workflows/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow }),
        });
        if (!response.ok) throw new Error("Failed to update workflow on the server.");
        
        setProjectWorkflows(prev => ({ ...prev, [projectId]: workflow }));
        logAction('Project Workflow Updated', `Workflow for project ID ${projectId} was updated.`, {});
        toast({ title: "Project Workflow Updated" });
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not save workflow changes.", variant: "destructive" });
      }
    });
  };

  const addRejectionTag = async (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => {
    await withMutation(async () => {
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
    });
  };

  const updateRejectionTag = async (tagId: string, tagData: Partial<Omit<RejectionTag, 'id' | 'clientId'>>) => {
    await withMutation(async () => {
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
    });
  };

  const deleteRejectionTag = async (tagId: string) => {
    await withMutation(async () => {
      const tag = rejectionTags.find(t => t.id === tagId);
      try {
          const response = await fetch(`/api/rejection-tags/${tagId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete rejection tag');
          setRejectionTags(prev => prev.filter(t => t.id !== tagId));
          logAction('Rejection Tag Deleted', `Tag "${tag?.label}" deleted.`, {});
          toast({ title: "Rejection Reason Deleted", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete rejection reason.", variant: "destructive" });
      }
    });
  };

  const addStorage = async (storageData: StorageFormValues) => {
    await withMutation(async () => {
      try {
          const response = await fetch('/api/storages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(storageData),
          });
          if (!response.ok) throw new Error('Failed to create storage');
          const newStorage = await response.json();
          setStorages(prev => [...prev, newStorage]);
          logAction('Storage Created', `New storage location "${newStorage.nome}" added.`, {});
          toast({ title: "Storage Added" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not create storage.", variant: "destructive" });
      }
    });
  };

  const updateStorage = async (storageId: string, storageData: StorageFormValues) => {
    await withMutation(async () => {
      try {
          const response = await fetch(`/api/storages/${storageId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(storageData),
          });
          if (!response.ok) throw new Error('Failed to update storage');
          const updatedStorage = await response.json();
          setStorages(prev => prev.map(s => s.id === Number(storageId) ? updatedStorage : s));
          logAction('Storage Updated', `Storage location "${updatedStorage.nome}" updated.`, {});
          toast({ title: "Storage Updated" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not update storage.", variant: "destructive" });
      }
    });
  };

  const deleteStorage = async (storageId: string) => {
    await withMutation(async () => {
      const storage = storages.find(s => s.id === Number(storageId));
      try {
          const response = await fetch(`/api/storages/${storageId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete storage');
          setStorages(prev => prev.filter(s => s.id !== Number(storageId)));
          logAction('Storage Deleted', `Storage location "${storage?.nome}" deleted.`, {});
          toast({ title: "Storage Deleted", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete storage.", variant: "destructive" });
      }
    });
  };
  
  const addScanner = async (scannerData: ScannerFormValues) => {
    await withMutation(async () => {
      try {
          const response = await fetch('/api/scanners', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(scannerData),
          });
          if (!response.ok) throw new Error('Failed to create scanner');
          const newScanner = await response.json();
          setScanners(prev => [...prev, newScanner]);
          logAction('Scanner Created', `New scanner "${newScanner.nome}" added.`, {});
          toast({ title: "Scanner Added" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not create scanner.", variant: "destructive" });
      }
    });
  };

  const updateScanner = async (scannerId: number, scannerData: ScannerFormValues) => {
    await withMutation(async () => {
      try {
          const response = await fetch(`/api/scanners/${scannerId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(scannerData),
          });
          if (!response.ok) throw new Error('Failed to update scanner');
          const updatedScanner = await response.json();
          setScanners(prev => prev.map(s => s.id === scannerId ? updatedScanner : s));
          logAction('Scanner Updated', `Scanner "${updatedScanner.nome}" updated.`, {});
          toast({ title: "Scanner Updated" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not update scanner.", variant: "destructive" });
      }
    });
  };

  const deleteScanner = async (scannerId: number) => {
    await withMutation(async () => {
      const scanner = scanners.find(s => s.id === scannerId);
      try {
          const response = await fetch(`/api/scanners/${scannerId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete scanner');
          setScanners(prev => prev.filter(s => s.id !== scannerId));
          logAction('Scanner Deleted', `Scanner "${scanner?.nome}" deleted.`, {});
          toast({ title: "Scanner Deleted", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not delete scanner.", variant: "destructive" });
      }
    });
  };
  
  const addProjectStorage = async (associationData: Omit<ProjectStorage, 'projectId'> & {projectId: string}) => {
    await withMutation(async () => {
      try {
        const response = await fetch('/api/project-storages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(associationData),
        });
        if (!response.ok) throw new Error('Failed to add project-storage association');
        const newAssociation = await response.json();
        setProjectStorages(prev => [...prev, newAssociation]);
        logAction('Project Storage Added', `Storage associated with project.`, {});
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not add association.", variant: "destructive" });
      }
    });
  };

  const updateProjectStorage = async (associationData: Omit<ProjectStorage, 'projectId'> & {projectId: string}) => {
    await withMutation(async () => {
      try {
        const response = await fetch('/api/project-storages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(associationData),
        });
        if (!response.ok) throw new Error('Failed to update project-storage association');
        const updatedAssociation = await response.json();
        setProjectStorages(prev => prev.map(ps => 
            (ps.projectId === updatedAssociation.projectId && ps.storageId === updatedAssociation.storageId)
            ? updatedAssociation
            : ps
        ));
        logAction('Project Storage Updated', `Association for project ${associationData.projectId} updated.`, {});
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not update association.", variant: "destructive" });
      }
    });
  };

  const deleteProjectStorage = async (projectId: string, storageId: number) => {
    await withMutation(async () => {
      try {
        const response = await fetch('/api/project-storages', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, storageId }),
        });
        if (!response.ok) throw new Error('Failed to delete project-storage association');
        setProjectStorages(prev => prev.filter(ps => !(ps.projectId === projectId && ps.storageId === storageId)));
        logAction('Project Storage Removed', `Association between project ${projectId} and storage ${storageId} removed.`, {});
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not remove association.", variant: "destructive" });
      }
    });
  };


  const updateDocument = async (docId: string, data: Partial<AppDocument>) => {
    return await withMutation(async () => {
      const doc = rawDocuments.find(d => d.id === docId);
      if (!doc) return;
      try {
          const response = await fetch(`/api/documents/${docId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error('Failed to update document');
          const updatedDocData = await response.json();
          setRawDocuments(prev => prev.map(d => (d.id === docId ? { ...d, ...updatedDocData } : d)));
          
          let logDetails = `Document "${doc.name}" updated.`;
          if (data.tags) logDetails = `Tags for document "${doc.name}" updated to: ${data.tags.join(', ') || 'None'}.`;
          if (data.flag !== undefined) logDetails = `Flag for document "${doc.name}" set to ${data.flag || 'None'}.`;
          logAction('Document Updated', logDetails, { documentId: docId, bookId: doc.bookId ?? undefined });
          toast({ title: "Document Updated" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not update document.", variant: "destructive" });
      }
    });
  };
  
  const tagPageForRejection = async (pageId: string, tags: string[]) => {
      await updateDocument(pageId, { tags });
      const doc = documents.find(d => d.id === pageId);
      if(doc) {
        logAction('Page Tagged', `Page "${doc.name}" tagged for rejection with: ${tags.join(', ')}.`, { documentId: pageId, bookId: doc.bookId });
      }
  };

  const updateDocumentFlag = async (docId: string, flag: AppDocument['flag'], comment?: string) => await updateDocument(docId, { flag, flagComment: flag ? comment : undefined });
  const addPageToBook = async (bookId: string, position: number) => {
    await withMutation(async () => {
      const book = enrichedBooks.find(b => b.id === bookId);
      if (!book) return;
      const newPageName = `${book.name} - Page ${position} (Added)`;
      const newPageId = `doc_${book.id}_new_${Date.now()}`;
      
      const newPage: Partial<RawDocument> = {
        id: newPageId, name: newPageName, clientId: book.clientId, 
        type: 'Added Page', lastUpdated: getDbSafeDate(), 
        tags: JSON.stringify(['added', 'corrected']),
        projectId: book.projectId, bookId: book.id, 
        flag: 'info', flagComment: 'This page was manually added during the correction phase.',
        imageUrl: `https://dummyimage.com/400x550/e0e0e0/5c5c5c.png&text=${encodeURIComponent(newPageName)}`
      };
      try {
          const response = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPage) });
          if (!response.ok) throw new Error('Failed to add page');
          const createdPage = await response.json();
          setRawDocuments(prevDocs => {
            const otherPages = prevDocs.filter(p => p.bookId !== bookId);
            const bookPages = prevDocs.filter(p => p.bookId === bookId);
            bookPages.splice(position - 1, 0, createdPage);
            return [...otherPages, ...bookPages];
          });
          setRawBooks(prev => prev.map(b => b.id === bookId ? { ...b, expectedDocuments: (b.expectedDocuments || 0) + 1 } : b));
          logAction('Page Added', `New page added to "${book.name}" at position ${position}.`, { bookId, documentId: newPageId });
          toast({ title: "Page Added" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Could not add page.", variant: "destructive" });
      }
    });
  }

  const deletePageFromBook = async (pageId: string, bookId: string) => {
    await withMutation(async () => {
        const page = rawDocuments.find(p => p.id === pageId);
        try {
            const response = await fetch(`/api/documents/${pageId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete page');
            setRawDocuments(prev => prev.filter(p => p.id !== pageId));
            setRawBooks(prev => prev.map(b => b.id === bookId ? {...b, expectedDocuments: (b.expectedDocuments || 1) - 1 } : b));
            logAction('Page Deleted', `Page "${page?.name}" was deleted from book.`, { bookId, documentId: pageId });
            toast({ title: "Page Deleted", variant: "destructive" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not delete page.", variant: "destructive" });
        }
    });
  };

  const updateBookStatus = React.useCallback(async (
    bookId: string, newStatusName: string, additionalUpdates: Partial<RawBook> = {}
  ) => {
    const statusId = statuses.find(s => s.name === newStatusName)?.id;
    if (!statusId) throw new Error(`Status ${newStatusName} not found.`);
    const response = await fetch(`/api/books/${bookId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statusId, ...additionalUpdates }) });
    if (!response.ok) throw new Error('Failed to update book status');
    return await response.json();
  }, [statuses]);

  const moveBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
    console.log(`[moveBookFolder] Attempting to move folder for book: ${bookName} from ${fromStatusName} to ${toStatusName}`);
    
    const fromStatus = statuses.find(s => s.name === fromStatusName);
    const toStatus = statuses.find(s => s.name === toStatusName);
    
    if (!fromStatus) {
        toast({ title: "Workflow Config Error", description: `Source status "${fromStatusName}" not found.`, variant: "destructive" });
        console.error(`[moveBookFolder] Source status "${fromStatusName}" not found.`);
        return false;
    }
     if (!toStatus) {
        toast({ title: "Workflow Config Error", description: `Destination status "${toStatusName}" not found.`, variant: "destructive" });
        console.error(`[moveBookFolder] Destination status "${toStatusName}" not found.`);
        return false;
    }

    if (!fromStatus.folderName || !toStatus.folderName) {
        console.log(`[moveBookFolder] Logical move from ${fromStatusName} to ${toStatusName}. No physical folder move needed.`);
        return true; 
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
    if (!apiUrl) {
      console.warn("[moveBookFolder] WORKFLOW API URL not configured. Physical folder move will be skipped.");
      return true;
    }
    
    try {
        console.log(`[moveBookFolder] Calling API to move folder for "${bookName}".`);
        const response = await fetch(`${apiUrl}/api/workflow/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookName, fromStatus: fromStatusName, toStatus: toStatusName }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error || `Failed to move folder. API responded with status ${response.status}`;
            console.error(`[moveBookFolder] API Error: ${errorMessage}`);
            logAction('System Alert', `Failed to move folder for book "${bookName}" from ${fromStatusName} to ${toStatusName}. Reason: ${errorMessage}`, { userId: 'u_system' });
            toast({ title: "Folder Move Failed", description: errorMessage, variant: "destructive", duration: 10000 });
            return false;
        }
        console.log(`[moveBookFolder] Successfully moved folder for ${bookName}.`);
        return true;
    } catch (error: any) {
        console.error("[moveBookFolder] Network or fetch error:", error);
        toast({ title: "Folder Move Error", description: `Could not move folder for "${bookName}". Please check API logs.`, variant: "destructive" });
        logAction('System Alert', `Error moving folder for book "${bookName}". Reason: ${error.message}`, { userId: 'u_system' });
        return false;
    }
  }, [statuses, toast, logAction]);
  
  const handleMarkAsShipped = (bookIds: string[]) => {
    withMutation(async () => {
      for (const bookId of bookIds) {
        try {
          const updatedBook = await updateBookStatus(bookId, 'In Transit');
          setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
          logAction('Book Shipped', `Client marked book "${updatedBook?.name}" as shipped.`, { bookId });
        } catch (error) {
           toast({ title: "Error", description: `Could not mark book ${bookId} as shipped.`, variant: "destructive" });
        }
      }
      toast({ title: `${bookIds.length} Book(s) Marked as Shipped` });
    });
  };

  const handleConfirmReception = (bookId: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book) return;

      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      const newStatusName = 'Received';
      if (!currentStatusName) return;

      const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
      if (moveResult !== true) return;

      const updatedBook = await updateBookStatus(bookId, newStatusName);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Reception Confirmed', `Book "${updatedBook.name}" has been marked as received.`, { bookId });
      toast({ title: "Reception Confirmed" });
    });
  };
  
  const handleSendToStorage = async (bookId: string, payload: { actualPageCount: number }) => {
    setProcessingBookIds(prev => [...prev, bookId]);
    await withMutation(async () => {
      try {
        const book = rawBooks.find(b => b.id === bookId);
        if (!book) throw new Error("Book not found");
        const project = rawProjects.find(p => p.id === book.projectId);
        if (!project) throw new Error("Project not found");

        const response = await fetch(`/api/books/${bookId}/complete-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualPageCount: payload.actualPageCount,
            bookName: book.name,
            clientId: project.clientId,
            projectId: book.projectId
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to complete scan via API');
        }
        
        const { book: updatedRawBook, documents: newRawDocuments } = await response.json();
        
        setRawBooks(prevBooks => prevBooks.map(b => b.id === bookId ? updatedRawBook : b));
        setRawDocuments(prevDocs => [...prevDocs, ...newRawDocuments]);
        
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name || 'Unknown';
        const logMessage = findStageKeyFromStatus(currentStatusName) === 'already-received' ? 'Reception & Scan Skipped' : 'Scanning Finished';
        logAction(logMessage, `${payload.actualPageCount} pages created. Book "${book.name}" moved to Storage.`, { bookId });
        toast({ title: "Task Complete", description: `Book moved to Storage.` });
  
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not complete the process.", variant: "destructive" });
      } finally {
        setProcessingBookIds(prev => prev.filter(id => id !== bookId));
      }
    });
  };

  const handleMoveBookToNextStage = React.useCallback(async (bookId: string, currentStatus: string): Promise<boolean> => {
    console.log(`[handleMoveBookToNextStage] Starting for book ${bookId} from status ${currentStatus}`);
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId) {
      console.error(`[handleMoveBookToNextStage] Book or projectId not found for bookId ${bookId}`);
      return false;
    }

    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(currentStatus);
    if (!currentStageKey) {
      toast({ title: "Workflow Error", description: `Cannot find workflow stage for status: "${currentStatus}".`, variant: "destructive" });
      console.error(`[handleMoveBookToNextStage] Workflow key not found for status: ${currentStatus}`);
      return false;
    }
    console.log(`[handleMoveBookToNextStage] Current stage key: ${currentStageKey}`);

    const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
    console.log(`[handleMoveBookToNextStage] Next stage key: ${nextStageKey}`);
    
    const newStatusName = nextStageKey ? (STAGE_CONFIG[nextStageKey]?.dataStatus || 'Unknown') : 'Complete';
    if (newStatusName === 'Unknown') {
      toast({ title: "Workflow Error", description: `Next stage "${nextStageKey}" has no configured status.`, variant: "destructive" });
      console.error(`[handleMoveBookToNextStage] Next stage "${nextStageKey}" has no status.`);
      return false;
    }

    console.log(`[handleMoveBookToNextStage] Moving book to new status: ${newStatusName}`);
    const moveResult = await moveBookFolder(book.name, currentStatus, newStatusName);
    if (moveResult !== true) {
      console.error(`[handleMoveBookToNextStage] moveBookFolder failed for book ${bookId}`);
      return false; // Stop execution if folder move fails
    }

    const updatedBook = await updateBookStatus(bookId, newStatusName);
    setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    logAction('Workflow Step', `Book "${book.name}" moved from ${currentStatus} to ${newStatusName}.`, { bookId });
    console.log(`[handleMoveBookToNextStage] Successfully moved book ${bookId} to ${newStatusName}`);
    return true;
  }, [rawBooks, projectWorkflows, statuses, toast, logAction, updateBookStatus, moveBookFolder]);


  const handleAssignUser = async (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => {
    withMutation(async () => {
      const user = users.find(u => u.id === userId);
      const book = rawBooks.find(b => b.id === bookId);
      if (!user || !book || !book.projectId) return;

      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;
      const currentStageKey = findStageKeyFromStatus(currentStatusName);
      if (!currentStageKey) return;
      
      const nextStageKey = getNextEnabledStage(currentStageKey, projectWorkflows[book.projectId] || []);
      if (!nextStageKey) return;

      const newStatusName = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Unknown';
      if(newStatusName === 'Unknown') return;
      
      const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
      if (moveResult !== true) return;
      
      let logMsg = '', updates: Partial<RawBook> = {};
      if (role === 'scanner') { updates.scannerUserId = userId; logMsg = 'Assigned to Scanner'; }
      else if (role === 'indexer') { updates.indexerUserId = userId; logMsg = 'Assigned to Indexer'; }
      else if (role === 'qc') { updates.qcUserId = userId; logMsg = 'Assigned for QC'; }
      
      const updatedBook = await updateBookStatus(bookId, newStatusName, updates);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      
      logAction(logMsg, `Book "${book.name}" assigned to ${user.name}.`, { bookId });
      toast({ title: "Book Assigned", description: `Assigned to ${user.name} for ${role}.` });
    });
  };

  const reassignUser = (bookId: string, newUserId: string, role: 'scanner' | 'indexer' | 'qc') => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      const newUser = users.find(u => u.id === newUserId);
      if (!book || !newUser) return;
      const updateField: 'scannerUserId' | 'indexerUserId' | 'qcUserId' = `${role}UserId`;
      await updateBook(bookId, { [updateField]: newUserId });
      const oldUser = users.find(u => u.id === book[updateField]);
      logAction('User Reassigned', `Task for book "${book.name}" was reassigned from ${oldUser?.name || 'Unassigned'} to ${newUser.name}.`, { bookId });
      toast({ title: "User Reassigned", description: `${newUser.name} is now responsible for this task.` });
    });
  };

  const handleStartTask = (bookId: string, role: 'scanner' | 'indexing' | 'qc') => {
    withMutation(async () => {
        const book = rawBooks.find(b => b.id === bookId);
        if (!book || !book.projectId || !currentUser) return;

        if (role === 'scanner') {
            const updatedBook = await updateBookStatus(bookId, 'Scanning Started', { scanStartTime: getDbSafeDate() });
            setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
            logAction('Scanning Started', `Scanning process initiated for book.`, { bookId });
            toast({ title: "Scanning Started" });
            return;
        }

        const log = transferLogs.find(l => l.bookId === bookId && l.status === 'sucesso');
        if (!log) {
            toast({ title: "Transfer Log Not Found", description: `Cannot find a successful transfer log for book "${book.name}".`, variant: "destructive" });
            return;
        }

        const storage = storages.find(s => s.id === Number(log.storage_id));
        if (!storage) {
            toast({ title: "Storage Not Found", description: `Cannot find storage with ID ${log.storage_id}.`, variant: "destructive" });
            return;
        }

        const scanner = scanners.find(s => s.id === Number(log.scanner_id));
        if (!scanner) {
            toast({ title: "Scanner Not Found", description: `Cannot find scanner with ID ${log.scanner_id}.`, variant: "destructive" });
            return;
        }

        const workflow = projectWorkflows[book.projectId] || [];
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        const currentStageKey = findStageKeyFromStatus(currentStatusName);
        if (!currentStageKey) return;
        const nextStatusKey = getNextEnabledStage(currentStageKey, workflow);
        if (!nextStatusKey) return;

        const newStatusName = STAGE_CONFIG[nextStatusKey]?.dataStatus || 'Unknown';
        if(newStatusName === 'Unknown') return;

        const newStageFolder = statuses.find(s => s.name === newStatusName)?.folderName;
        if (!newStageFolder) {
            toast({ title: "Workflow Error", description: `Folder for status "${newStatusName}" is not defined.`, variant: "destructive" });
            return;
        }

        const project = rawProjects.find(p => p.id === book.projectId);
        if (!project) {
            toast({ title: "Project Not Found", description: `Cannot find project for book "${book.name}".`, variant: "destructive" });
            return;
        }
        
        const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
        if (moveResult !== true) return;

        let logMsg = '', updates: Partial<RawBook> = {}, appProtocol = '', bookDirectory = '';

        const baseArgs = {
            userId: currentUser.id,
            bookId: book.id,
        };

        if (role === 'indexing') {
            updates.indexingStartTime = getDbSafeDate();
            logMsg = 'Indexing Started';
            appProtocol = 'rfs-indexing-app';
            bookDirectory = `${storage.root_path}/${newStageFolder}/${project.name}/${book.name}`;
        } else if (role === 'qc') {
            updates.qcStartTime = getDbSafeDate();
            logMsg = 'Checking Started';
            appProtocol = 'rfs-check-app';
            bookDirectory = `${storage.root_path}/${newStageFolder}/${project.name}/${scanner.nome}/${book.name}`;
        }

        const updatedBook = await updateBookStatus(bookId, newStatusName, updates);
        setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));

        logAction(logMsg, `${logMsg} process initiated for book.`, { bookId });
        toast({ title: logMsg });

        if (appProtocol) {
            openLocalApp(appProtocol, { ...baseArgs, bookDirectory });
        }
    });
  };
  
  const handleCompleteTask = async (bookId: string, stage: string) => {
    await withMutation(async () => {
      const updateFields: { [key: string]: Partial<RawBook> } = {
        'Scanning Started': { scanEndTime: getDbSafeDate() },
        'Indexing Started': { indexingEndTime: getDbSafeDate() },
        'Checking Started': { qcEndTime: getDbSafeDate() },
      };
      
      const update = updateFields[stage];
      if (update) {
        await updateBook(bookId, update);
        const book = rawBooks.find(b => b.id === bookId);
        logAction('Task Completed', `Task "${stage}" completed for book "${book?.name}".`, { bookId });
        toast({ title: 'Task Marked as Complete' });
      }
    });
  };

  const handleCancelCompleteTask = async (bookId: string, stage: string) => {
    await withMutation(async () => {
      const updateFields: { [key: string]: Partial<RawBook> } = {
        'Scanning Started': { scanEndTime: null },
        'Indexing Started': { indexingEndTime: null },
        'Checking Started': { qcEndTime: null },
      };
  
      const update = updateFields[stage];
      if (update) {
        await updateBook(bookId, update);
  
        const book = rawBooks.find(b => b.id === bookId);
        logAction(
          'Task Completion Cancelled',
          `Task "${stage}" cancelled for book "${book?.name}".`,
          { bookId }
        );
  
        toast({ title: 'Task Completion Cancelled' });
      }
    });
  };

  const handleCancelTask = (bookId: string, currentStatus: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book) return;
      
      const updates: { [key: string]: { bookStatus: string, logMsg: string, clearFields: Partial<RawBook> } } = {
        'Scanning Started': { bookStatus: 'To Scan', logMsg: 'Scanning', clearFields: { scanStartTime: undefined } },
        'Indexing Started': { bookStatus: 'To Indexing', logMsg: 'Indexing', clearFields: { indexingStartTime: undefined } },
        'Checking Started': { bookStatus: 'To Checking', logMsg: 'Checking', clearFields: { qcStartTime: undefined } },
      };
      const updateKey = Object.keys(updates).find(key => currentStatus.startsWith(key));
      if (!updateKey) return;
      const update = updates[updateKey];
      
      const moveResult = await moveBookFolder(book.name, currentStatus, update.bookStatus);
      if (moveResult !== true) return;
      
      const updatedBook = await updateBookStatus(bookId, update.bookStatus, update.clearFields);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));

      logAction('Task Cancelled', `${update.logMsg} for book "${book.name}" was cancelled.`, { bookId });
      toast({ title: 'Task Cancelled', description: `Book returned to ${update.bookStatus} Queue.`, variant: 'destructive' });
    });
  };
  
  const handleAdminStatusOverride = (bookId: string, newStatusName: string, reason: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      const newStatus = statuses.find(s => s.name === newStatusName);
      if (!book || !newStatus) return;
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;
      const newStageKey = findStageKeyFromStatus(newStatus.name);
      const newStageConfig = newStageKey ? STAGE_CONFIG[newStageKey] : null;
      const updates: Partial<RawBook> = {};
      if (newStageConfig?.assigneeRole !== 'scanner') { updates.scannerUserId = undefined; updates.scanStartTime = undefined; updates.scanEndTime = undefined; }
      if (newStageConfig?.assigneeRole !== 'indexer') { updates.indexerUserId = undefined; updates.indexingStartTime = undefined; updates.indexingEndTime = undefined; }
      if (newStageConfig?.assigneeRole !== 'qc') { updates.qcUserId = undefined; updates.qcStartTime = undefined; updates.qcEndTime = undefined; }
      
      const moveResult = await moveBookFolder(book.name, currentStatusName, newStatus.name);
      if (moveResult !== true) return;

      const updatedBook = await updateBookStatus(bookId, newStatus.name, updates);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Admin Status Override', `Status of "${book.name}" manually changed to "${newStatus.name}". Reason: ${reason}`, { bookId });
      toast({ title: "Status Overridden", description: `Book is now in status: ${newStatus.name}` });
    });
  };

  const logProcessingEvent = React.useCallback(async (
    batchId: string, 
    message: string, 
    level: 'INFO' | 'ERROR' | 'WARN' = 'INFO'
  ) => {
    try {
        const response = await fetch('/api/processing-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId, message, level }),
        });
        if (!response.ok) throw new Error('Failed to create processing log');
        const newLog = await response.json();
        setProcessingLogs(prev => [...prev, newLog]);
    } catch (error) {
        console.error("Failed to save processing log:", error);
    }
  }, []);

  const startProcessingBatch = async (bookIds: string[], storageId: string) => {
    await withMutation(async () => {
      if (!currentUser) {
        toast({ title: "Error", description: "Current user not found.", variant: "destructive" });
        return;
      }
      try {
        const fromStatusName = 'Ready for Processing';
        const toStatusName = 'In Processing';

        for (const bookId of bookIds) {
          const book = rawBooks.find(b => b.id === bookId);
          if (book) {
            const moveResult = await moveBookFolder(book.name, fromStatusName, toStatusName);
            if (!moveResult) {
              throw new Error(`Failed to move folder for book "${book.name}". Batch start aborted.`);
            }
          }
        }

        const response = await fetch('/api/processing-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds }),
        });
        if (!response.ok) throw new Error('Failed to create processing batch');
        const newBatch = await response.json();
        
        setProcessingBatches(prev => [newBatch, ...prev]);
        const statusId = statuses.find(s => s.name === 'In Processing')?.id;
        if(statusId) {
            setRawBooks(prev => prev.map(b => bookIds.includes(b.id) ? { ...b, statusId } : b));
        }
        
        logAction('Processing Batch Started', `Batch ${newBatch.id} started with ${bookIds.length} books.`, {});
        await logProcessingEvent(newBatch.id, `Batch ${newBatch.id} started with ${bookIds.length} books.`);
        toast({ title: "Processing Batch Started" });
        
        const storage = storages.find(s => String(s.id) === storageId);
        if (!storage) {
          toast({ title: "Error", description: `Storage with ID ${storageId} not found. Cannot launch local app.`, variant: "destructive" });
          return;
        }

        openLocalApp('rfs-processa-app', {
          userId: currentUser.id,
          batchId: newBatch.id,
          batchName: newBatch.timestampStr,
          storageId: storageId,
          rootPath: storage.root_path,
        });

      } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "Could not start processing batch.", variant: "destructive" });
      }
    });
  };

  const failureProcessingBatch = async (batchId: string, storageId: string) => {
    await withMutation(async () => {
      const batch = processingBatches.find(b => b.id === batchId);
      if (!batch || !currentUser) return;
      
      try {
        logAction('Processing Batch Retry', `User retrying failed batch ${batch.id}.`, { userId: currentUser.id });
        await logProcessingEvent(batch.id, `User ${currentUser.name} initiated a retry for this failed batch.`);
        toast({ title: "Retrying Batch..." });
        
        const storage = storages.find(s => String(s.id) === storageId);
        if (!storage) {
          toast({ title: "Error", description: `Storage with ID ${storageId} not found. Cannot launch local app.`, variant: "destructive" });
          return;
        }

        openLocalApp('rfs-processa-app', {
          userId: currentUser.id,
          batchId: batch.id,
          batchName: batch.timestampStr,
          storageId: storageId,
          rootPath: storage.root_path,
        });

      } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "Could not start failed processing batch.", variant: "destructive" });
      }
     
    });
  };

  const completeProcessingBatch = async (batchId: string) => {
    await withMutation(async () => {
      const batch = processingBatches.find(b => b.id === batchId);
      if (!batch) return;
      
      const itemsInBatch = processingBatchItems.filter(i => i.batchId === batchId);
      const bookIdsInBatch = itemsInBatch.map(i => i.bookId);

      try {
        const response = await fetch(`/api/processing-batches/${batchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Complete', endTime: getDbSafeDate(), progress: 100 }),
        });
        if (!response.ok) throw new Error('Failed to update batch');
        const updatedBatch = await response.json();
        setProcessingBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));

        for (const bookId of bookIdsInBatch) {
            handleMoveBookToNextStage(bookId, 'In Processing');
        }

        logAction('Processing Batch Completed', `Batch ${batchId} was completed.`, {});
        await logProcessingEvent(batchId, `Batch ${batchId} marked as completed by user.`);
        toast({ title: "Processing Batch Completed" });
      } catch(error) {
        console.error(error);
        toast({ title: "Error", description: `Could not complete batch ${batchId}.`, variant: "destructive" });
      }
    });
  };

  const handleSendBatchToNextStage = async (batchIds: string[]) => {
    await withMutation(async () => {
        let allSucceeded = true;
        const failedBooks: string[] = [];
  
        for (const batchId of batchIds) {
            const itemsInBatch = processingBatchItems.filter(i => i.batchId === batchId);
            for (const item of itemsInBatch) {
                const moveResult = await handleMoveBookToNextStage(item.bookId, 'Processed');
                let itemUpdateResponse;
                try {
                    itemUpdateResponse = await fetch(`/api/processing-batch-items/${item.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: moveResult ? 'Finalized' : 'CQ Failed' }),
                    });
                     if (!itemUpdateResponse.ok) throw new Error('Failed to update item status');

                    const updatedItem = await itemUpdateResponse.json();
                     setProcessingBatchItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
                } catch (e) {
                     console.error(`Failed to update status for item ${item.id}`, e);
                }

                if (!moveResult) {
                    allSucceeded = false;
                    const book = rawBooks.find(b => b.id === item.bookId);
                    if (book) {
                        failedBooks.push(book.name);
                        logAction('Final QC Failed', `Book "${book.name}" failed to move to Final QC.`, { bookId: item.bookId });
                    }
                }
            }
            
            if (allSucceeded) {
                 try {
                    const response = await fetch(`/api/processing-batches/${batchId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Finalized' }),
                    });
                     if (!response.ok) throw new Error('Failed to update batch status');
                    const updatedBatch = await response.json();
                     setProcessingBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));
                     logAction('Batch Sent to Final QC', `Batch ${batchId} was successfully sent to Final QC.`, {});
                 } catch (e) {
                     console.error(`Failed to finalize batch ${batchId}`, e);
                 }
            }
        }
  
        if (failedBooks.length > 0) {
            toast({
                title: "Some Items Failed",
                description: `Could not move the following books: ${failedBooks.join(', ')}. The batch remains in 'Processed' state.`,
                variant: "destructive"
            });
        } else {
            toast({ title: "Batches Sent", description: `${batchIds.length} batch(es) moved to Final Quality Control.` });
        }
    });
  };

  const setProvisionalDeliveryStatus = async (deliveryItemId: string, bookId: string, status: 'approved' | 'rejected', reason?: string) => {
    await withMutation(async () => {
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
        
        toast({ title: `Book Marked as ${status}` });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  const finalizeDeliveryBatch = async (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => {
    await withMutation(async () => {
        if (!currentUser) return;
        
        const batch = deliveryBatches.find(b => b.id === deliveryId);
        if (!batch) return;
        
        const itemsInBatch = deliveryBatchItems.filter(item => item.deliveryId === deliveryId);

        try {
            for (const item of itemsInBatch) {
                const book = rawBooks.find(b => b.id === item.bookId);
                if (!book) continue;

                const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
                if (!currentStatusName) {
                    console.error(`Could not find status name for statusId: ${book.statusId}`);
                    continue;
                }
                
                let newStatusName: string;
                
                if (finalDecision === 'reject_all') {
                    newStatusName = 'Client Rejected';
                } else { // approve_remaining
                    newStatusName = item.status === 'rejected' ? 'Client Rejected' : 'Finalized';
                }
                
                if (currentStatusName !== newStatusName) {
                    await moveBookFolder(book.name, currentStatusName, newStatusName);
                }
            }

            const response = await fetch(`/api/delivery-batches/${deliveryId}/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalDecision, userId: currentUser.id }),
            });
            if (!response.ok) throw new Error('Failed to finalize batch via API.');

            // Re-fetch all data to ensure client state is in sync with the backend
            const [
                booksData, batchesData, itemsData, auditData
            ] = await Promise.all([
                dataApi.getRawBooks(),
                dataApi.getDeliveryBatches(),
                dataApi.getDeliveryBatchItems(),
                dataApi.getAuditLogs(),
            ]);
            
            setRawBooks(booksData);
            setDeliveryBatches(batchesData);
            setDeliveryBatchItems(itemsData);
            const enrichedAuditLogs = auditData.map(log => ({ ...log, user: users.find(u => u.id === log.userId)?.name || 'Unknown' })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAuditLogs(enrichedAuditLogs);
            
            logAction('Delivery Batch Finalized', `Batch ${deliveryId} was finalized by ${currentUser.name}. Decision: ${finalDecision}.`, { userId: currentUser.id });
            toast({ title: "Validation Confirmed", description: "All books in the batch have been processed." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });
  };
  
   const distributeValidationSample = async (batchId: string, assignments: { itemId: string, userId: string}[]) => {
     await withMutation(async () => {
        try {
            const response = await fetch('/api/delivery-batches/distribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchId, assignments }),
            });
            if (!response.ok) throw new Error('Failed to distribute sample');
            
            const { batch, items } = await response.json();
            
            setDeliveryBatches(prev => prev.map(b => b.id === batch.id ? batch : b));
            setDeliveryBatchItems(prev => [...prev.filter(i => i.deliveryId !== batchId), ...items]);

            logAction('Validation Distributed', `${assignments.length} items from batch ${batchId} distributed.`, {});
            toast({ title: "Sample Distributed", description: "Tasks have been assigned to operators." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
     });
   };

  const approveBatch = async (deliveryId: string) => {
    withMutation(async () => {
        const itemsToApprove = deliveryBatchItems.filter(item => item.deliveryId === deliveryId && item.status === 'pending');
        for (const item of itemsToApprove) {
            await setProvisionalDeliveryStatus(item.id, item.bookId, 'approved');
        }
        await finalizeDeliveryBatch(deliveryId, 'approve_remaining');
    });
  };

  const handleFinalize = (bookId: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book || !book.projectId) return;
      const workflow = projectWorkflows[book.projectId] || [];
      const nextStageKey = getNextEnabledStage('finalized', workflow) || 'archive';
      const newStatus = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Archived';
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;

      const moveResult = await moveBookFolder(book.name, currentStatusName, newStatus);
      if (moveResult !== true) return;

      const updatedBook = await updateBookStatus(bookId, newStatus);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Book Archived', `Book "${book?.name}" was finalized and moved to ${newStatus}.`, { bookId });
      toast({ title: "Book Archived" });
    });
  };
  
  const handleMarkAsCorrected = (bookId: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book || !book.projectId) return;
      const workflow = projectWorkflows[book.projectId] || [];
      const nextStageKey = getNextEnabledStage('client-rejections', workflow) || 'corrected';
      const newStatus = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Corrected';
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;
      
      const moveResult = await moveBookFolder(book.name, currentStatusName, newStatus);
      if (moveResult !== true) return;
      
      const updatedBook = await updateBookStatus(bookId, newStatus, { rejectionReason: null });
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Marked as Corrected', `Book "${book.name}" marked as corrected after client rejection.`, { bookId });
      toast({ title: "Book Corrected" });
    });
  };

  const handleResubmit = (bookId: string, targetStage: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book) return;
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;

      const moveResult = await moveBookFolder(book.name, currentStatusName, targetStage);
      if (moveResult !== true) return;

      const updatedBook = await updateBookStatus(bookId, targetStage);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Book Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
      toast({ title: "Book Resubmitted" });
    });
  };

  const handleCreateDeliveryBatch = async (bookIds: string[]) => {
    await withMutation(async () => {
      try {
        const response = await fetch('/api/delivery-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds, userId: currentUser?.id }),
        });
        if (!response.ok) throw new Error('Failed to create delivery batch');
        
        const newBatch = await response.json();
        setDeliveryBatches(prev => [newBatch, ...prev]);

        const newItems = bookIds.map(bookId => ({
            id: `del_item_${newBatch.id}_${bookId}`,
            deliveryId: newBatch.id,
            bookId: bookId,
            user_id: currentUser!.id,
            status: 'pending' as const,
            info: null,
            obs: null
        }));
        setDeliveryBatchItems(prev => [...prev, ...newItems]);
        
        // Move all books to the next stage
        for (const bookId of bookIds) {
          const book = rawBooks.find(b => b.id === bookId);
          if (book) {
              await handleMoveBookToNextStage(book.id, 'Delivery');
          }
        }
        
        logAction('Delivery Batch Created', `Batch ${newBatch.id} created with ${bookIds.length} books and sent to client.`, {});
        toast({ title: "Delivery Batch Created & Sent" });
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not create delivery batch.", variant: "destructive" });
      }
    });
  };
  
  const handlePullNextTask = React.useCallback(async (currentStageKey: string, userIdToAssign?: string) => {
    await withMutation(async () => {
        const assigneeId = userIdToAssign || currentUser?.id;
        if (!assigneeId) {
            toast({ title: "Error", description: "No user specified for assignment.", variant: "destructive" });
            return;
        }

        const user = users.find(u => u.id === assigneeId);
        if (!user) {
            toast({ title: "Error", description: "Assignee not found.", variant: "destructive" });
            return;
        }
        
        const workflowConfig = STAGE_CONFIG[currentStageKey];
        if (!workflowConfig || !workflowConfig.assigneeRole) {
            toast({ title: "Workflow Error", description: "Invalid stage for pulling tasks.", variant: "destructive" });
            return;
        }

        const currentIndex = WORKFLOW_SEQUENCE.indexOf(currentStageKey);
        if (currentIndex === -1 || currentIndex === 0) {
            toast({ title: "Workflow Error", description: "Cannot pull task from a starting stage.", variant: "destructive" });
            return;
        }

        const previousStageKey = WORKFLOW_SEQUENCE[currentIndex - 1];
        const previousStageStatus = STAGE_CONFIG[previousStageKey]?.dataStatus;
        if (!previousStageStatus) {
            toast({ title: "Workflow Error", description: `Previous stage (${previousStageKey}) has no defined status.`, variant: "destructive" });
            return;
        }

        let bookToAssign = enrichedBooks.find(b => 
            b.status === previousStageStatus &&
            !b[workflowConfig.assigneeRole! + 'UserId' as keyof EnrichedBook] && // Check if not already assigned for the target role
            (!selectedProjectId || b.projectId === selectedProjectId)
        );

        if (!bookToAssign) {
            toast({ title: "No Tasks Available", description: "There are no unassigned books in the previous stage.", variant: "default" });
            return;
        }

        handleAssignUser(bookToAssign.id, assigneeId, workflowConfig.assigneeRole);
        toast({ title: "Task Pulled Successfully", description: `"${bookToAssign.name}" has been assigned to ${user.name}.` });
    });
  }, [currentUser, users, enrichedBooks, selectedProjectId, handleAssignUser, toast]);

  const scannerUsers = React.useMemo(() => users.filter(user => user.role === 'Scanning'), [users]);
  const indexerUsers = React.useMemo(() => users.filter(user => user.role === 'Indexing'), [users]);
  const qcUsers = React.useMemo(() => users.filter(user => user.role === 'QC Specialist'), [users]);

  const projectsForContext = React.useMemo(() => {
    if (!selectedProjectId) return accessibleProjectsForUser;
    return allEnrichedProjects.filter(p => p.id === selectedProjectId);
  }, [allEnrichedProjects, accessibleProjectsForUser, selectedProjectId]);
  
  const booksForContext = React.useMemo(() => {
    if (!selectedProjectId) return enrichedBooks.filter(book => accessibleProjectsForUser.some(p => p.id === book.projectId));
    const project = allEnrichedProjects.find(p => p.id === selectedProjectId);
    return project ? project.books : [];
  }, [allEnrichedProjects, enrichedBooks, accessibleProjectsForUser, selectedProjectId]);

  const documentsForContext = React.useMemo(() => {
    const bookIdsInScope = new Set(booksForContext.map(b => b.id));
    return documents.filter(d => d.bookId && bookIdsInScope.has(d.bookId));
  }, [documents, booksForContext]);


  const value: AppContextType = { 
    loading, isMutating, processingBookIds, setIsMutating,
    currentUser, login, logout, changePassword,
    navigationHistory, addNavigationHistoryItem,
    clients, users, scannerUsers, indexerUsers, qcUsers,
    projects: projectsForContext, 
    books: booksForContext, 
    documents: documentsForContext, 
    auditLogs,
    processingBatches, processingBatchItems, processingLogs,
    deliveryBatches, deliveryBatchItems,
    roles,
    permissions,
    projectWorkflows,
    projectStorages,
    rejectionTags,
    storages,
    scanners,
    rawBooks,
    statuses,
    allProjects: allEnrichedProjects,
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
    tagPageForRejection,
    addStorage, updateStorage, deleteStorage,
    addScanner, updateScanner, deleteScanner,
    addProjectStorage, updateProjectStorage, deleteProjectStorage,
    getNextEnabledStage,
    handleMarkAsShipped,
    handleConfirmReception,
    handleSendToStorage,
    handleMoveBookToNextStage, 
    setProvisionalDeliveryStatus,
    approveBatch,
    handleFinalize, handleMarkAsCorrected, handleResubmit,
    addPageToBook, deletePageFromBook,
    updateDocumentFlag, startProcessingBatch, failureProcessingBatch, completeProcessingBatch, handleSendBatchToNextStage,
    handleAssignUser, reassignUser, handleStartTask, handleCancelTask,
    handleAdminStatusOverride, handleCreateDeliveryBatch, finalizeDeliveryBatch,
    distributeValidationSample,
    handleCompleteTask,handleCancelCompleteTask, handlePullNextTask,
    logAction,
    moveBookFolder,
    updateBookStatus,
    setRawBooks,
    setDeliveryBatches,
    setDeliveryBatchItems,
    setAuditLogs,
    setProcessingBatchItems,
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

    





