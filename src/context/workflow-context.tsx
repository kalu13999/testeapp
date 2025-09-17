

"use client"

import * as React from 'react';
import type { Client, User, Project, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog, ProcessingLog, Permissions, ProjectWorkflows, RejectionTag, DocumentStatus, ProcessingBatch, ProcessingBatchItem, Storage, LogTransferencia, ProjectStorage, Scanner, DeliveryBatch, DeliveryBatchItem, BookObservation } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { WORKFLOW_SEQUENCE, STAGE_CONFIG, findStageKeyFromStatus, getNextEnabledStage } from '@/lib/workflow-config';
import * as dataApi from '@/lib/data';
import { UserFormValues } from '@/app/(app)/users/user-form';
import { StorageFormValues } from '@/app/(app)/admin/general-configs/storage-form';
import { ScannerFormValues } from '@/app/(app)/admin/general-configs/scanner-form';
import { format } from 'date-fns';
import { log } from 'console';

export type { EnrichedBook, RejectionTag };

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
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean | undefined>;

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
  bookObservations: BookObservation[];
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
  addBookObservation: (bookId: string, observation: string) => Promise<void>;
  
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
  handleStartTask: (bookId: string, role: 'scanner' | 'indexer' | 'qc') => void;
  openAppValidateScan: (bookId: string) => void;
  handleCompleteTask: (bookId: string, stage: string) => void;
  handleCancelCompleteTask: (bookId: string, stage: string) => void;
  handleCancelTask: (bookId: string, currentStatus: string) => void;
  handleAdminStatusOverride: (bookId: string, newStatusName: string, reason: string) => void;
  startProcessingBatch: (bookIds: string[], storageId: string) => void;
  failureProcessingBatch: (batchId: string, storageId: string) => void;
  completeProcessingBatch: (batchId: string) => void;
  failProcessingBatch: (batchId: string) => void;
  handleSendBatchToNextStage: (batchIds: string[]) => Promise<void>;
  setProvisionalDeliveryStatus: (deliveryItemId: string, bookId: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  approveBatch: (deliveryId: string) => void;
  handleFinalize: (bookId: string) => void;
  handleMarkAsCorrected: (bookId: string) => void;
  handleResubmit: (bookId: string, targetStage: string) => void;
  handleResubmitCopyTifs: (bookId: string, targetStage: string) => void;
  handleResubmitMoveTifs: (bookId: string, targetStage: string) => void;
  handleCreateDeliveryBatch: (bookIds: string[]) => Promise<void>;
  finalizeDeliveryBatch: (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => Promise<void>;
  distributeValidationSample: (batchId: string, assignments: { itemId: string; userId: string }[]) => Promise<void>;
  addPageToBook: (bookId: string, position: number) => Promise<void>;
  deletePageFromBook: (pageId: string, bookId: string) => Promise<void>;
  updateDocumentFlag: (docId: string, flag: AppDocument['flag'], comment?: string) => Promise<void>;
  handlePullNextTask: (currentStage: string, userIdToAssign?: string) => Promise<void>;
  logAction: (action: string, details: string, ids: { bookId?: string; documentId?: string; userId?: string; }) => Promise<void>;
  moveBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
  moveTifsBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
  copyTifsBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
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
 const [bookObservations, setBookObservations] = React.useState<BookObservation[]>([]);
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
        toast({ title: "Operação Falhou", description: error.message, variant: "destructive" });
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
                deliveryBatchesData, deliveryBatchItemsData, bookObservationsData,
            ] = await Promise.all([
                dataApi.getClients(), dataApi.getUsers(), dataApi.getRawProjects(),
                dataApi.getRawBooks(), dataApi.getRawDocuments(), dataApi.getAuditLogs(),
                dataApi.getProcessingBatches(), dataApi.getProcessingBatchItems(), dataApi.getProcessingLogs(),
                dataApi.getPermissions(), dataApi.getRoles(),
                dataApi.getProjectWorkflows(), dataApi.getRejectionTags(), dataApi.getDocumentStatuses(),
                dataApi.getStorages(), dataApi.getScanners(), dataApi.getTransferLogs(), dataApi.getProjectStorages(),
                dataApi.getDeliveryBatches(), dataApi.getDeliveryBatchItems(), dataApi.getBookObservations(),
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
            setBookObservations(bookObservationsData);

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
            toast({title: "Erro ao Carregar Dados", description: "Não foi possível conectar ao servidor. Por favor, verifique a sua conexão e atualize.", variant: "destructive"});
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [toast]);


  const login = async (username: string, password: string): Promise<User | null> => {

    const user = users.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase() && u.password === password);
    if (user) {
      if (user.status === 'disabled') {
        toast({title: "Login Falhou", description: "A sua conta está desativada. Por favor, contacte um administrador.", variant: "destructive"});
        return null;
      }

      setSelectedProjectId(null);
      setCurrentUser(user);
      localStorage.setItem('flowvault_userid', user.id);
      if (localStorage.getItem('flowvault_projectid')) {
        localStorage.removeItem('flowvault_projectid');
      }
      const storedHistory = localStorage.getItem(`nav_history_${user.id}`);
      if(storedHistory) {
        setNavigationHistory(JSON.parse(storedHistory));
      } else {
        setNavigationHistory([]);
      }

      await regLastLogin(user);
      
      return user;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    setSelectedProjectId(null);
    setNavigationHistory([]);
    localStorage.removeItem('flowvault_userid');
  };
  
  const regLastLogin = async (
    user: User
  ) => {
    try {
      const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastLogin: now }),
      });
      if(response.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? {...u, lastLogin: now} : u));
      }
    } catch (error) {
      console.error("Falha ao registar o lastLogin", error);
    }
  };



  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean | undefined> => {
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
          toast({ title: "Palavra-passe alterada com sucesso" });
          return true;
      } catch (error: any) {
          toast({ title: "Falha ao Alterar Palavra-passe", description: error.message, variant: "destructive" });
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
    ids: { bookId?: string | null, documentId?: string, userId?: string }
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
        if (doc.tags && typeof doc.tags === 'string' && (doc.tags as string).trim() !== '') {
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
          if (!response.ok) throw new Error('Falha ao criar cliente');
          
          const newClient = await response.json();
          
          setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
          logAction('Client Created', `New client "${newClient.name}" added.`, {});
          toast({ title: "Cliente Adicionado", description: `Cliente "${newClient.name}" foi criado.` });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível criar o cliente.", variant: "destructive" });
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
          toast({ title: "Cliente Atualizado", description: "Os detalhes do cliente foram guardados." });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o cliente.", variant: "destructive" });
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
                   toast({ title: "Falha na Eliminação", description: "Não é possível eliminar o cliente com projetos associados. Por favor, reatribua ou elimine os projetos primeiro.", variant: "destructive" });
                   return;
              }
              throw new Error('Falha ao eliminar cliente');
          }
          
          const associatedProjectIds = rawProjects.filter(p => p.clientId === clientId).map(p => p.id);
          
          setClients(prev => prev.filter(c => c.id !== clientId));
          setRawProjects(prev => prev.filter(p => p.clientId !== clientId));
          setRawBooks(prev => prev.filter(b => !associatedProjectIds.includes(b.projectId)));
          setRawDocuments(prev => prev.filter(d => d.clientId !== clientId));
          setRejectionTags(prev => prev.filter(t => t.clientId !== clientId));

          if (associatedProjectIds.includes(selectedProjectId!)) setSelectedProjectId(null);
          logAction('Client Deleted', `Client "${clientToDelete?.name}" was deleted.`, {});
          toast({ title: "Cliente Eliminado", description: "O cliente foi eliminado.", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível eliminar o cliente.", variant: "destructive" });
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
              throw new Error(error.error || 'Falha ao criar o utilizador');
          }
          const newUser: User = await response.json();
          setUsers(prev => [...prev, newUser]);
          logAction('User Created', `New user "${newUser.name}" added with role ${newUser.role}.`, {});
          toast({ title: "Utilizador Adicionado", description: `O utilizador "${newUser.name}" foi criado.` });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível criar o utilizador.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao atualizar utilizador');
          const updatedUser = await response.json();
          setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
          logAction('User Updated', `Details for user "${updatedUser.name}" updated.`, {});
          toast({ title: "Utilizador Atualizado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o utilizador.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao alternar estado do utilizador');
          const updatedUser = await response.json();
          setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
          logAction('User Status Changed', `User "${user.name}" was ${newStatus}.`, {});
          toast({ title: `Utilizador ${newStatus === 'active' ? 'Ativado' : 'Desativado'}` });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o estado do utilizador.", variant: "destructive" });
      }
    });
  };

  const deleteUser = async (userId: string) => {
    await withMutation(async () => {
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete || userToDelete.role === 'System') return;
      try {
          const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Falha ao eliminar utilizador');
          setUsers(prev => prev.filter(u => u.id !== userId));
          logAction('User Deleted', `User "${userToDelete?.name}" was deleted.`, {});
          toast({ title: "Utilizador Eliminado", description: "O utilizador foi eliminado.", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível eliminar o utilizador.", variant: "destructive" });
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
        if (!response.ok) throw new Error("Falha ao atualizar o projeto padrão do utilizador.");
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser);
        }
        logAction('Default Project Set', `Default project for user ${updatedUser.name} set.`, {});
        toast({ title: "Projeto Padrão Atualizado" });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Erro", description: error.message, variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao criar o projeto');
          const newProject = await response.json();
          setRawProjects(prev => [...prev, newProject]);
          setProjectWorkflows(prev => ({ ...prev, [newProject.id]: WORKFLOW_SEQUENCE }));
          logAction('Project Created', `New project "${newProject.name}" added.`, {});
          toast({ title: "Projeto Adicionado", description: `O projeto "${newProject.name}" foi criado.` });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível criar o projeto.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao atualizar o projeto');
          const updatedProject = await response.json();
          setRawProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updatedProject } : p));
          logAction('Project Updated', `Details for project "${updatedProject.name}" updated.`, {});
          toast({ title: "Projeto Atualizado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o projeto.", variant: "destructive" });
      }
    });
  };

  const deleteProject = async (projectId: string) => {
    await withMutation(async () => {
        const projectToDelete = rawProjects.find(p => p.id === projectId);
        try {
            const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao eliminar projeto');
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
            toast({ title: "Projeto Eliminado", variant: "destructive" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível eliminar o projeto.", variant: "destructive" });
        }
    });
  };

  const addBook = async (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => {
      await withMutation(async () => {
        try {
            const statusId = statuses.find(s => s.name === 'Pending Shipment')?.id;
            if (!statusId) throw new Error("Não foi possível encontrar o estado 'Envio Pendente'.");
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, book: {...bookData, statusId } }),
            });
            if (!response.ok) throw new Error('Falha ao criar livro');
            const newRawBook = await response.json();
            setRawBooks(prev => [...prev, newRawBook]);
            logAction('Book Added', `Book "${newRawBook.name}" was added to project.`, { bookId: newRawBook.id });
            toast({ title: "Livro Adicionado", description: `O livro "${newRawBook.name}" foi adicionado.` });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível criar o livro.", variant: "destructive" });
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
            if (!response.ok) throw new Error('Falha ao atualizar livro');
            const updatedRawBook = await response.json();
            setRawBooks(prev => prev.map(b => b.id === bookId ? updatedRawBook : b));
            logAction('Book Updated', `Details for book "${updatedRawBook.name}" were updated.`, { bookId });
            toast({ title: "Livro Atualizado" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível atualizar o livro.", variant: "destructive" });
        }
      });
  };

  const deleteBook = async (bookId: string) => {
      await withMutation(async () => {
        const bookToDelete = rawBooks.find(b => b.id === bookId);
        try {
            const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao eliminar livro');
            setRawBooks(prev => prev.filter(b => b.id !== bookId));
            setRawDocuments(prev => prev.filter(d => d.bookId !== bookId));
            logAction('Book Deleted', `Book "${bookToDelete?.name}" and its pages were deleted.`, { bookId });
            toast({ title: "Livro Eliminado", variant: "destructive" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível eliminar o livro.", variant: "destructive" });
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
            if (!response.ok) throw new Error('Falha ao importar livros');
            const createdBooks = await response.json();
            setRawBooks(prev => [...prev, ...createdBooks]);
            logAction('Books Imported', `${createdBooks.length} books imported for project.`, {});
            toast({title: "Importação Bem-Sucedida", description: `${createdBooks.length} livros foram adicionados ao projeto.`});
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível importar livros.", variant: "destructive" });
        }
      });
  };

const addBookObservation = async (bookId: string, observation: string) => {
    if (!currentUser) return;
    await withMutation(async () => {
        try {
            const book = rawBooks.find(b => b.id === bookId);
            const bookStatus = statuses.find(s => s.id === book?.statusId)?.name;

            const response = await fetch('/api/book-observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    book_id: bookId,
                    user_id: currentUser.id,
                    observation,
                    info: bookStatus ? `Status: ${bookStatus}` : 'Status: Unknown'
                }),
            });
            if (!response.ok) throw new Error('Falha ao adicionar observação');
            const newObservation = await response.json();
            setBookObservations(prev => [newObservation, ...prev]);
            logAction('Observation Added', `Observation added to book.`, { bookId });
            toast({ title: "Observação Adicionada" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível adicionar a observação.", variant: "destructive" });
        }
    });
  };

  const addRole = (roleName: string, rolePermissions: string[]) => {
    withMutation(async () => {
      if (roles.includes(roleName)) {
        toast({ title: "Perfil Já Existe", description: "Já existe um perfil com este nome.", variant: "destructive" });
        return;
      }
      setRoles(prev => [...prev, roleName]);
      setPermissions(prev => ({...prev, [roleName]: rolePermissions }));
      logAction('Role Created', `New role "${roleName}" was created.`, {});
      toast({ title: "Perfil Criado", description: `Perfil "${roleName}" foi adicionado.` });
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
          throw new Error('Falha ao guardar permissões no banco de dados.');
        }
        setPermissions(prev => ({ ...prev, [roleName]: rolePermissions }));
        logAction('Role Updated', `Permissions for role "${roleName}" were updated.`, {});
        toast({ title: "Perfil Atualizado", description: `Permissões para "${roleName}" foram guardadas.` });
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível atualizar as permissões do perfil.", variant: "destructive" });
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
      toast({ title: "Perfil Eliminado", description: `Perfil "${roleName}" foi eliminado.`, variant: "destructive" });
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
        if (!response.ok) throw new Error("Falha ao atualizar o fluxo de trabalho no servidor.");

        setProjectWorkflows(prev => ({ ...prev, [projectId]: workflow }));
        logAction('Project Workflow Updated', `Workflow for project ID ${projectId} was updated.`, {});
        toast({ title: "Fluxo de Trabalho do Projeto Atualizado" });
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível guardar as alterações no fluxo de trabalho.", variant: "destructive" });
      }
    });
  };

  const addRejectionTag = async (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => {
    await withMutation(async () => {
      if (!clientId) {
        toast({ title: "ID do Cliente está ausente", variant: "destructive" });
        return;
      }
      try {
          const response = await fetch('/api/rejection-tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...tagData, clientId }),
          });
          if (!response.ok) throw new Error('Falha ao criar tag de rejeição');
          const newTag = await response.json();
          setRejectionTags(prev => [...prev, newTag]);
          const client = clients.find(c => c.id === clientId);
          logAction('Rejection Tag Created', `Tag "${newTag.label}" criada para o cliente "${client?.name}".`, {});
          toast({ title: "Motivo de Rejeição Adicionado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível criar o motivo de rejeição.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao atualizar tag de rejeição');
          const updatedTag = await response.json();
          setRejectionTags(prev => prev.map(t => t.id === tagId ? updatedTag : t));
          logAction('Rejection Tag Updated', `Tag "${updatedTag.label}" updated.`, {});
          toast({ title: "Motivo de Rejeição Atualizado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o motivo de rejeição.", variant: "destructive" });
      }
    });
  };

  const deleteRejectionTag = async (tagId: string) => {
    await withMutation(async () => {
      const tag = rejectionTags.find(t => t.id === tagId);
      try {
          const response = await fetch(`/api/rejection-tags/${tagId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Falha ao eliminar etiqueta de rejeição');
          setRejectionTags(prev => prev.filter(t => t.id !== tagId));
          logAction('Rejection Tag Deleted', `Tag "${tag?.label}" deleted.`, {});
          toast({ title: "Etiqueta de Rejeição Eliminada", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível eliminar a etiqueta de rejeição.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao criar Armazenamento');
          const newStorage = await response.json();
          setStorages(prev => [...prev, newStorage]);
          logAction('Storage Created', `New storage location "${newStorage.nome}" added.`, {});
          toast({ title: "Armazenamento Adicionado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível criar o armazenamento.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao atualizar o armazenamento');
          const updatedStorage = await response.json();
          setStorages(prev => prev.map(s => s.id === Number(storageId) ? updatedStorage : s));
          logAction('Storage Updated', `Storage location "${updatedStorage.nome}" updated.`, {});
          toast({ title: "Armazenamento Atualizado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o armazenamento.", variant: "destructive" });
      }
    });
  };

  const deleteStorage = async (storageId: string) => {
    await withMutation(async () => {
      const storage = storages.find(s => s.id === Number(storageId));
      try {
          const response = await fetch(`/api/storages/${storageId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Falha ao eliminar armazenamento');
          setStorages(prev => prev.filter(s => s.id !== Number(storageId)));
          logAction('Storage Deleted', `Storage location "${storage?.nome}" deleted.`, {});
          toast({ title: "Armazenamento Eliminado", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível eliminar o armazenamento.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao criar scanner');
          const newScanner = await response.json();
          setScanners(prev => [...prev, newScanner]);
          logAction('Scanner Created', `New scanner "${newScanner.nome}" added.`, {});
          toast({ title: "Scanner Adicionado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível criar o scanner.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao atualizar scanner');
          const updatedScanner = await response.json();
          setScanners(prev => prev.map(s => s.id === scannerId ? updatedScanner : s));
          logAction('Scanner Updated', `Scanner "${updatedScanner.nome}" updated.`, {});
          toast({ title: "Scanner Atualizado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o scanner.", variant: "destructive" });
      }
    });
  };

  const deleteScanner = async (scannerId: number) => {
    await withMutation(async () => {
      const scanner = scanners.find(s => s.id === scannerId);
      try {
          const response = await fetch(`/api/scanners/${scannerId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Falha ao eliminar scanner');
          setScanners(prev => prev.filter(s => s.id !== scannerId));
          logAction('Scanner Deleted', `Scanner "${scanner?.nome}" deleted.`, {});
          toast({ title: "Scanner Eliminado", variant: "destructive" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível eliminar o scanner.", variant: "destructive" });
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
        if (!response.ok) throw new Error('Falha ao adicionar associação de armazenamento ao projeto');
        const newAssociation = await response.json();
        setProjectStorages(prev => [...prev, newAssociation]);
        logAction('Project Storage Added', `Storage associated with project.`, {});
        toast({ title: "Associação Adicionada" });
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível adicionar a associação.", variant: "destructive" });
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
        if (!response.ok) throw new Error('Falha ao atualizar associação de armazenamento do projeto');
        const updatedAssociation = await response.json();
        setProjectStorages(prev => prev.map(ps => 
            (ps.projectId === updatedAssociation.projectId && ps.storageId === updatedAssociation.storageId)
            ? updatedAssociation
            : ps
        ));
        logAction('Project Storage Updated', `Association for project ${associationData.projectId} updated.`, {});
        toast({ title: "Associação Atualizada" });
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível atualizar a associação.", variant: "destructive" });
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
        if (!response.ok) throw new Error('Falha ao eliminar associação de armazenamento do projeto');
        setProjectStorages(prev => prev.filter(ps => !(ps.projectId === projectId && ps.storageId === storageId)));
        logAction('Project Storage Removed', `Association between project ${projectId} and storage ${storageId} removed.`, {});
        toast({ title: "Associação Eliminada" });
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível eliminar a associação.", variant: "destructive" });
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
          if (!response.ok) throw new Error('Falha ao atualizar documento');
          const updatedDocData = await response.json();
          setRawDocuments(prev => prev.map(d => (d.id === docId ? { ...d, ...updatedDocData } : d)));
          
          let logDetails = `Document "${doc.name}" updated.`;
          if (data.tags) logDetails = `Tags for document "${doc.name}" updated to: ${data.tags.join(', ') || 'None'}.`;
          if (data.flag !== undefined) logDetails = `Flag for document "${doc.name}" set to ${data.flag || 'None'}.`;
          logAction('Document Updated', logDetails, { documentId: docId, bookId: doc.bookId ?? undefined });
          toast({ title: "Documento Atualizado" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível atualizar o documento.", variant: "destructive" });
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
        tags: ['added', 'corrected'],
        projectId: book.projectId, bookId: book.id, 
        flag: 'info', flagComment: 'This page was manually added during the correction phase.',
        imageUrl: `https://dummyimage.com/400x550/e0e0e0/5c5c5c.png&text=${encodeURIComponent(newPageName)}`
      };
      try {
          const response = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPage) });
          if (!response.ok) throw new Error('Falha ao adicionar página');
          const createdPage = await response.json();
          setRawDocuments(prevDocs => {
            const otherPages = prevDocs.filter(p => p.bookId !== bookId);
            const bookPages = prevDocs.filter(p => p.bookId === bookId);
            bookPages.splice(position - 1, 0, createdPage);
            return [...otherPages, ...bookPages];
          });
          setRawBooks(prev => prev.map(b => b.id === bookId ? { ...b, expectedDocuments: (b.expectedDocuments || 0) + 1 } : b));
          logAction('Page Added', `New page added to "${book.name}" at position ${position}.`, { bookId, documentId: newPageId });
          toast({ title: "Página Adicionada" });
      } catch (error) {
          console.error(error);
          toast({ title: "Erro", description: "Não foi possível adicionar a página.", variant: "destructive" });
      }
    });
  }

  const deletePageFromBook = async (pageId: string, bookId: string) => {
    await withMutation(async () => {
        const page = rawDocuments.find(p => p.id === pageId);
        try {
            const response = await fetch(`/api/documents/${pageId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao eliminar página');
            setRawDocuments(prev => prev.filter(p => p.id !== pageId));
            setRawBooks(prev => prev.map(b => b.id === bookId ? {...b, expectedDocuments: (b.expectedDocuments || 1) - 1 } : b));
            logAction('Page Deleted', `Page "${page?.name}" was deleted from book.`, { bookId, documentId: pageId });
            toast({ title: "Página Eliminada", variant: "destructive" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível eliminar a página.", variant: "destructive" });
        }
    });
  };

  const updateBookStatus = React.useCallback(async (
    bookId: string, newStatusName: string, additionalUpdates: Partial<RawBook> = {}
  ) => {
    const statusId = statuses.find(s => s.name === newStatusName)?.id;
    if (!statusId) throw new Error(`Status ${newStatusName} not found.`);
    const response = await fetch(`/api/books/${bookId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statusId, ...additionalUpdates }) });
    if (!response.ok) {
      throw new Error(`Falha ao atualizar o estado do livro: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }, [statuses]);

  const moveBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
    console.log(`[moveBookFolder] Attempting to move folder for book: ${bookName} from ${fromStatusName} to ${toStatusName}`);
    
    const fromStatus = statuses.find(s => s.name === fromStatusName);
    const toStatus = statuses.find(s => s.name === toStatusName);
    
    if (!fromStatus) {
        toast({ title: "Erro de Configuração do Fluxo de Trabalho", description: `Estado de origem "${fromStatusName}" não encontrado.`, variant: "destructive" });
        console.error(`[moveBookFolder] Source status "${fromStatusName}" not found.`);
        return false;
    }
     if (!toStatus) {
        toast({ title: "Erro de Configuração do Fluxo de Trabalho", description: `Estado de destino "${toStatusName}" não encontrado.`, variant: "destructive" });
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
            const errorMessage = errorData.error || `Falha ao mover pasta. API respondeu com estado ${response.status}`;
            console.error(`[moveBookFolder] API Error: ${errorMessage}`);
            logAction('System Alert', `Failed to move folder for book "${bookName}" from ${fromStatusName} to ${toStatusName}. Reason: ${errorMessage}`, { userId: 'u_system' });
            toast({ title: "Erro ao Mover Pasta", description: errorMessage, variant: "destructive", duration: 10000 });
            return false;
        }
        console.log(`[moveBookFolder] Successfully moved folder for ${bookName}.`);
        return true;
    } catch (error: any) {
        console.error("[moveBookFolder] Network or fetch error:", error);
        if (error.code === "ECONNREFUSED" || (error.message?.toLowerCase().includes("fetch") && error.message?.toLowerCase().includes("failed"))) {
          const msgerr = "API externa não está acessível (contacte um administrador)."
          toast({ title: "Erro ao mover pasta", description: `Não foi possível mover a pasta de "${bookName}". Verifique os logs.\n${msgerr}`, variant: "destructive" });
          logAction('System Alert', `Error moving folder for book "${bookName}". Reason: ${error.message}. ${msgerr}`, { userId: 'u_system' });
        } else {
          toast({ title: "Erro ao mover pasta", description: `Não foi possível mover a pasta de "${bookName}". Verifique os logs.`, variant: "destructive" });
          logAction('System Alert', `Error moving folder for book "${bookName}". Reason: ${error.message}`, { userId: 'u_system' }); 
        }       
        return false;
    }
  }, [statuses, toast, logAction]);
  
  const moveTifsBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
    console.log(`[moveTifsBookFolder] Attempting to move only TIFFs for book: ${bookName} from ${fromStatusName} to ${toStatusName}`);
  
    const fromStatus = statuses.find(s => s.name === fromStatusName);
    const toStatus = statuses.find(s => s.name === toStatusName);
    
    if (!fromStatus) {
        toast({ title: "Erro de Configuração do Fluxo de Trabalho", description: `Estado de origem "${fromStatusName}" não encontrado.`, variant: "destructive" });
        console.error(`[moveTifsBookFolder] Source status "${fromStatusName}" not found.`);
        return false;
    }
    if (!toStatus) {
        toast({ title: "Erro de Configuração do Fluxo de Trabalho", description: `Estado de destino "${toStatusName}" não encontrado.`, variant: "destructive" });
        console.error(`[moveTifsBookFolder] Destination status "${toStatusName}" not found.`);
        return false;
    }

    if (!fromStatus.folderName || !toStatus.folderName) {
        console.log(`[moveTifsBookFolder] Logical move from ${fromStatusName} to ${toStatusName}. No physical TIFF move needed.`);
        return true; 
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
    if (!apiUrl) {
      console.warn("[moveTifsBookFolder] WORKFLOW API URL not configured. Physical TIFF move will be skipped.");
      return true;
    }
    
    try {
      console.log(`[moveTifsBookFolder] Calling API to move only TIFFs for "${bookName}".`);
      const response = await fetch(`${apiUrl}/api/workflow/move-tifs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookName, fromStatus: fromStatusName, toStatus: toStatusName }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Falha ao mover TIFFs. API respondeu com estado ${response.status}`;
          console.error(`[moveTifsBookFolder] API Error: ${errorMessage}`);
          logAction('System Alert', `Failed to move TIFFs for book "${bookName}" from ${fromStatusName} to ${toStatusName}. Reason: ${errorMessage}`, { userId: 'u_system' });
          toast({ title: "Erro ao Mover TIFFs", description: errorMessage, variant: "destructive", duration: 10000 });
          return false;
      }
      console.log(`[moveTifsBookFolder] Successfully moved only TIFFs for ${bookName}.`);
      //tkoast({ title: "TIFFs Moved", description: `TIFF files for "${bookName}" successfully moved from ${fromStatusName} to ${toStatusName}.` });
      return true;
  } catch (error: any) {
      if (error.code === "ECONNREFUSED" || (error.message?.toLowerCase().includes("fetch") && error.message?.toLowerCase().includes("failed"))) {
        const msgerr = "API externa não está acessível (contacte um administrador)."
        toast({ title: "Erro ao Mover TIFFs", description: `Não foi possível mover os TIFFs para "${bookName}". Verifique os logs.\n${msgerr}`, variant: "destructive" });
        logAction('System Alert', `Error moving TIFFs for book "${bookName}". Reason: ${error.message}. ${msgerr}`, { userId: 'u_system' });
      } else {
        toast({ title: "Erro ao Mover TIFFs", description: `Não foi possível mover os TIFFs para "${bookName}". Verifique os logs.`, variant: "destructive" });
        logAction('System Alert', `Error moving TIFFs for book "${bookName}". Reason: ${error.message}`, { userId: 'u_system' });
      }
      console.error("[moveTifsBookFolder] Network or fetch error:", error);
      return false;
  }
}, [statuses, toast, logAction]);


const copyTifsBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
  console.log(`[copyTifsBookFolder] Attempting to copy only TIFFs for book: ${bookName} from ${fromStatusName} to ${toStatusName}`);
  
  const fromStatus = statuses.find(s => s.name === fromStatusName);
  const toStatus = statuses.find(s => s.name === toStatusName);
  
  if (!fromStatus) {
      toast({ title: "Erro de Configuração do Fluxo de Trabalho", description: `Estado de origem "${fromStatusName}" não encontrado.`, variant: "destructive" });
      console.error(`[copyTifsBookFolder] Source status "${fromStatusName}" not found.`);
      return false;
  }
   if (!toStatus) {
      toast({ title: "Erro de Configuração do Fluxo de Trabalho", description: `Estado de destino "${toStatusName}" não encontrado.`, variant: "destructive" });
      console.error(`[copyTifsBookFolder] Destination status "${toStatusName}" not found.`);
      return false;
  }

  if (!fromStatus.folderName || !toStatus.folderName) {
      console.log(`[copyTifsBookFolder] Logical copy from ${fromStatusName} to ${toStatusName}. No physical TIFF copy needed.`);
      return true; 
  }
  
  const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  if (!apiUrl) {
    console.warn("[copyTifsBookFolder] WORKFLOW API URL not configured. Physical TIFF copy will be skipped.");
    return true;
  }
  
  try {
      console.log(`[copyTifsBookFolder] Calling API to copy only TIFFs for "${bookName}".`);
      const response = await fetch(`${apiUrl}/api/workflow/copy-tifs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookName, fromStatus: fromStatusName, toStatus: toStatusName }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Falha ao copiar TIFFs. API respondeu com estado ${response.status}`;
          console.error(`[copyTifsBookFolder] API Error: ${errorMessage}`);
          logAction('System Alert', `Failed to copy TIFFs for book "${bookName}" from ${fromStatusName} to ${toStatusName}. Reason: ${errorMessage}`, { userId: 'u_system' });
          toast({ title: "Erro ao Copiar TIFFs", description: errorMessage, variant: "destructive", duration: 10000 });
          return false;
      }
      console.log(`[copyTifsBookFolder] Successfully copied only TIFFs for ${bookName}.`);
      return true;
  } catch (error: any) {
    if (error.code === "ECONNREFUSED" || (error.message?.toLowerCase().includes("fetch") && error.message?.toLowerCase().includes("failed"))) {
        const msgerr = "API externa não está acessível (contacte um administrador)."
        toast({ title: "Erro ao Copiar TIFFs", description: `Não foi possível copiar os TIFFs para "${bookName}". Verifique os logs.\n${msgerr}`, variant: "destructive" });
        logAction('System Alert', `Error copying TIFFs for book "${bookName}". Reason: ${error.message}. ${msgerr}`, { userId: 'u_system' });
    }else{
        toast({ title: "Erro ao Copiar TIFFs", description: `Não foi possível copiar os TIFFs para "${bookName}". Verifique os logs.`, variant: "destructive" });
        logAction('System Alert', `Error copying TIFFs for book "${bookName}". Reason: ${error.message}`, { userId: 'u_system' });
    }      
    console.error("[copyTifsBookFolder] Network or fetch error:", error);
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
           toast({ title: "Erro", description: `Não foi possível marcar o livro ${bookId} como enviado.`, variant: "destructive" });
        }
      }
      toast({ title: `${bookIds.length} Livro(s) Marcado(s) como Enviado(s)` });
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
      toast({ title: "Recepção Confirmada" });
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
        toast({ title: "Tarefa Completa", description: `Livro movido para o Armazenamento.` });

      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível completar o processo.", variant: "destructive" });
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
      toast({ title: "Erro de Fluxo de Trabalho", description: `Não foi possível encontrar o estágio de fluxo para o status: "${currentStatus}".`, variant: "destructive" });
      console.error(`[handleMoveBookToNextStage] Workflow key not found for status: ${currentStatus}`);
      return false;
    }
    console.log(`[handleMoveBookToNextStage] Current stage key: ${currentStageKey}`);

    const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
    console.log(`[handleMoveBookToNextStage] Next stage key: ${nextStageKey}`);
    
    const newStatusName = nextStageKey ? (STAGE_CONFIG[nextStageKey]?.dataStatus || 'Unknown') : 'Complete';
    if (newStatusName === 'Unknown') {
      toast({ title: "Erro de Fluxo de Trabalho", description: `Próximo estágio "${nextStageKey}" não tem status configurado.`, variant: "destructive" });
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
      toast({ title: "Livro Atribuído", description: `Atribuído a ${user.name} para ${role}.` });
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
      toast({ title: "Utilizador Reatribuído", description: `${newUser.name} agora é responsável por esta tarefa.` });
    });
  };

const getLocalIP = async (): Promise<string> => {
  let localIP = "IP não identificado";
  try {
    const res = await fetch("/api/getip");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    localIP = data.ip;
    console.log("IP detectado via API:", localIP);
  } catch (err) {
    console.error("Erro ao buscar IP:", err);
  }
  return localIP;
};


const openAppValidateScan = (bookId: string) => {
  
  withMutation(async () => {
    const book = rawBooks.find(b => b.id === bookId);
    if (!book || !book.projectId || !currentUser) return;

    // Faz o pedido à API getip
    const localIP = await getLocalIP();
/*apenas encontra o primeiro mesmo com varios
    const scanner = scanners.find(s => s.ip === localIP);
    if (!scanner) {
      toast({
        title: "Scanner Não Encontrado",
        description: `Não foi possível encontrar o scanner para o seu IP atual ${localIP}.`,
        variant: "destructive"
      });
      return;
    }else{
      toast({ title: `Scanner encontrado para o IP: ${localIP}, ${scanner.nome}, ${scanner.scanner_root_folder}` });
    }*/
    const matchingScanners = scanners.filter(s => s.ip === localIP);

    if (matchingScanners.length === 0) {
      toast({
        title: "Scanner Não Encontrado",
        description: `Não foi possível encontrar nenhum scanner para o seu IP atual ${localIP}.`,
        variant: "destructive"
      });
      return;
    } else {
      const nomes = matchingScanners.map(s => s.nome).join(", ");
      const paths = matchingScanners.map(s => s.scanner_root_folder).join(" | ");

      toast({
        title: `-- return;// -- retirar Scanners encontrados para o IP: ${localIP}`,
        description: (
              <div>
                <p><strong>Nomes:</strong> {nomes}</p>
                <p><strong>Diretórios:</strong> {paths}</p>
              </div>
            ),
      });
    }


    return;// retirar
    const scanner = matchingScanners[0]; // Pega o primeiro scanner correspondente
    const baseArgs = { userId: currentUser!.id, bookId: book!.id };
    const logMsg = "Scanning Validation";
    const appProtocol = "rfs-check-app";
    const bookDirectory = `${scanner!.scanner_root_folder}/${book!.name}`;

    logAction(logMsg, `${logMsg} processo iniciado para o livro.`, { bookId });
    toast({ title: logMsg });

    if (appProtocol) {
      openLocalApp(appProtocol, { ...baseArgs, bookDirectory });
    }
  });
};
  /*const openAppValidateScan = (bookId: string) => {
    withMutation(async () => {
        const book = rawBooks.find(b => b.id === bookId);
        if (!book || !book.projectId || !currentUser) return;

        const localIP = useLocalIP();
        const scanner = scanners.find(s => s.ip === localIP);
        if (!scanner) {
            toast({ title: "Scanner Não Encontrado", description: `Não foi possível encontrar o scanner para o seu Ip atual ${localIP}.`, variant: "destructive" });
            return;
        }

        let logMsg = '', updates: Partial<RawBook> = {}, appProtocol = '', bookDirectory = '';

        const baseArgs = {
            userId: currentUser.id,
            bookId: book.id,
        };

        logMsg = 'Scanning Validation';
        appProtocol = 'rfs-check-app';
        bookDirectory = `${scanner.scanner_root_folder}/${book.name}`;


        logAction(logMsg, `${logMsg} processo iniciado para o livro.`, { bookId });
        toast({ title: logMsg });

        if (appProtocol) {
            openLocalApp(appProtocol, { ...baseArgs, bookDirectory });
        }
    });
  };*/

  const handleStartTask = (bookId: string, role: 'scanner' | 'indexer' | 'qc') => {
    withMutation(async () => {
        const book = rawBooks.find(b => b.id === bookId);
        if (!book || !book.projectId || !currentUser) return;

        if (role === 'scanner') {
            const updatedBook = await updateBookStatus(bookId, 'Scanning Started', { scanStartTime: getDbSafeDate() });
            setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
            logAction('Scanning Started', `Scanning process initiated for book.`, { bookId });
            toast({ title: "Digitalização Iniciada" });
            return;
        }

        const log = transferLogs.find(l => l.bookId === bookId && l.status === 'sucesso');
        if (!log) {
            toast({ title: "Registro de Transferência Não Encontrado", description: `Não foi possível encontrar um registro de transferência bem-sucedido para o livro "${book.name}".`, variant: "destructive" });
            return;
        }

        const storage = storages.find(s => s.id === Number(log.storage_id));
        if (!storage) {
            toast({ title: "Armazenamento Não Encontrado", description: `Não foi possível encontrar o armazenamento com ID ${log.storage_id}.`, variant: "destructive" });
            return;
        }

        const scanner = scanners.find(s => s.id === Number(log.scanner_id));
        if (!scanner) {
            toast({ title: "Scanner Não Encontrado", description: `Não foi possível encontrar o scanner com ID ${log.scanner_id}.`, variant: "destructive" });
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
            toast({ title: "Erro de Fluxo de Trabalho", description: `Pasta para o status "${newStatusName}" não está definida.`, variant: "destructive" });
            return;
        }

        const project = rawProjects.find(p => p.id === book.projectId);
        if (!project) {
            toast({ title: "Projeto Não Encontrado", description: `Não foi possível encontrar o projeto para o livro "${book.name}".`, variant: "destructive" });
            return;
        }
        
        const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
        if (moveResult !== true) return;

        let logMsg = '', updates: Partial<RawBook> = {}, appProtocol = '', bookDirectory = '';

        const baseArgs = {
            userId: currentUser.id,
            bookId: book.id,
        };

        if (role === 'indexer') {
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

        logAction(logMsg, `${logMsg} processo iniciado para o livro.`, { bookId });
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

      const book = rawBooks.find(b => b.id === bookId);
      let msgfinal = ""
      if(stage === 'Scanning Started'){
        try {
            const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
            const localIP = await getLocalIP();

            const response = await fetch(`${apiUrl}/api/scan/count-tifs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookName: book?.name, scanIp: localIP }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || `Falha ao contar TIFs. API respondeu com estado ${response.status}`;
                logAction('Count TIFs', `Failed to count tifs for book "${book?.name}". Reason: ${errorMessage}`, { userId: currentUser?.id });
                toast({ title: "Erro ao Contar TIFs", description: errorMessage, variant: "destructive", duration: 5000 });
                return;
            }

            const data = await response.json();

            if (book?.id && data.tifCount !== undefined) {
              await updateBook(book.id, { expectedDocuments: data.tifCount });
            }

            logAction('Count TIFs', `Successfully counted ${data.tifCount} TIFs for book "${data.bookName}".`, { bookId, userId: currentUser?.id });
            msgfinal = `Todos os TIFs para "${data.bookName}" foram contados com sucesso. Total: ${data.tifCount}.`


        } catch (error: any) {
          if (error.code === "ECONNREFUSED" || (error.message?.toLowerCase().includes("fetch") && error.message?.toLowerCase().includes("failed"))) {
            const msgerr = "API externa não está acessível (contacte um administrador)."
            logAction('Count TIFs', `Error counting TIFs for book "${book?.name}". Reason: ${error.message}. ${msgerr}`, { bookId, userId: currentUser?.id });
            toast({ title: "Erro ao contar TIFs", description: `Não foi possível contar TIFs de "${book?.name}". Verifique os logs.\n${msgerr}`, variant: "destructive" });
          } else {
            logAction('Count TIFs', `Error counting TIFs for book "${book?.name}". Reason: ${error.message}.`, { bookId, userId: currentUser?.id });
            toast({ title: "Erro ao contar TIFs", description: `Não foi possível contar TIFs de "${book?.name}". Verifique os logs.`, variant: "destructive" });
          }
            return;
        }

      }

      const update = updateFields[stage];
      if (update) {
        await updateBook(bookId, update);
        const book = rawBooks.find(b => b.id === bookId);
        logAction('Task Completed', `Task "${stage}" completed for book "${book?.name}".`, { bookId });
        if(msgfinal === ""){
          toast({ title: 'Tarefa Completa' });
        }
      }

      if(msgfinal !== ""){
        toast({ title: "Tarefa Completa", description: msgfinal });
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

        toast({ title: "Tarefa em Espera", description: "A tarefa ficou à espera de ser completada.", variant: "destructive" });
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
      toast({ title: 'Tarefa Cancelada', description: `Livro retornado para a fila ${update.bookStatus}.`, variant: 'destructive' });
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
      toast({ title: "Status Sobrescrito", description: `Livro agora está no status: ${newStatus.name}` });
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
        toast({ title: "Erro", description: "Utilizador atual não encontrado.", variant: "destructive" });
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
              throw new Error(`Falha ao mover a pasta do livro "${book.name}". Início do lote abortado.`);
            }
          }
        }

        const response = await fetch('/api/processing-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds }),
        });
        if (!response.ok) throw new Error('Falha ao criar lote de processamento');
        const newBatch = await response.json();
        
        setProcessingBatches(prev => [newBatch, ...prev]);
        const statusId = statuses.find(s => s.name === 'In Processing')?.id;
        if(statusId) {
            setRawBooks(prev => prev.map(b => bookIds.includes(b.id) ? { ...b, statusId } : b));
        }
        
        logAction('Processing Batch Started', `Batch ${newBatch.id} started with ${bookIds.length} books.`, {});
        await logProcessingEvent(newBatch.id, `Batch ${newBatch.id} started with ${bookIds.length} books.`);
        toast({ title: "Lote de Processamento Iniciado" });

        const storage = storages.find(s => String(s.id) === storageId);
        if (!storage) {
          toast({ title: "Erro", description: `Armazenamento com ID ${storageId} não encontrado. Não é possível iniciar o aplicativo local.`, variant: "destructive" });
          return;
        }

        const firstBook = rawBooks.find(b => b.id === bookIds[0]);
        if (!firstBook) {
            toast({ title: "Erro", description: "Não foi possível encontrar o livro para determinar o ID do projeto.", variant: "destructive" });
            return;
        }
        const projectId = firstBook.projectId;

        openLocalApp('rfs-processa-app', {
          userId: currentUser.id,
          batchId: newBatch.id,
          batchName: newBatch.timestampStr,
          projectId: projectId,
          storageId: storageId,
          rootPath: storage.root_path,
        });

      } catch (error: any) {
        console.error(error);
        toast({ title: "Erro", description: error.message || "Não foi possível iniciar o lote de processamento.", variant: "destructive" });
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
        toast({ title: "A Reiniciar Lote..." });

        const storage = storages.find(s => String(s.id) === storageId);
        if (!storage) {
          toast({ title: "Erro", description: `Armazenamento com ID ${storageId} não encontrado. Não é possível iniciar o aplicativo local.`, variant: "destructive" });
          return;
        }

        // --- INÍCIO DA LÓGICA PROPOSTA ---
        const firstItemInBatch = processingBatchItems.find(item => item.batchId === batchId);
        if (!firstItemInBatch) {
            toast({ title: "Erro", description: "Não foi possível encontrar itens para este lote.", variant: "destructive" });
            return;
        }
        const book = rawBooks.find(b => b.id === firstItemInBatch.bookId);
        if (!book) {
            toast({ title: "Erro", description: `Não foi possível encontrar o livro com ID ${firstItemInBatch.bookId}.`, variant: "destructive" });
            return;
        }
        const projectId = book.projectId;
        // --- FIM DA LÓGICA PROPOSTA ---

        openLocalApp('rfs-processa-app', {
          userId: currentUser.id,
          batchId: batch.id,
          batchName: batch.timestampStr,
          projectId: projectId,
          storageId: storageId,
          rootPath: storage.root_path,
        });

      } catch (error: any) {
        console.error(error);
        toast({ title: "Erro", description: error.message || "Não foi possível iniciar o lote de processamento.", variant: "destructive" });
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
        if (!response.ok) throw new Error('Falha ao atualizar lote');
        const updatedBatch = await response.json();
        setProcessingBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));

        for (const bookId of bookIdsInBatch) {
            handleMoveBookToNextStage(bookId, 'In Processing');
        }

        logAction('Processing Batch Completed', `Batch ${batchId} was completed.`, {});
        await logProcessingEvent(batchId, `Batch ${batchId} marked as completed by user.`);
        toast({ title: "Lote de Processamento Completo" });
      } catch(error) {
        console.error(error);
        toast({ title: "Erro", description: `Não foi possível completar o lote ${batchId}.`, variant: "destructive" });
      }
    });
  };
  const failProcessingBatch = async (batchId: string) => {
    await withMutation(async () => {
      const batch = processingBatches.find(b => b.id === batchId);
      if (!batch) return;
      
      const itemsInBatch = processingBatchItems.filter(i => i.batchId === batchId);
      const bookIdsInBatch = itemsInBatch.map(i => i.bookId);

      try {
        const response = await fetch(`/api/processing-batches/${batchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Failed', endTime: getDbSafeDate()}),
        });
        if (!response.ok) throw new Error('Falha ao atualizar lote');
        const updatedBatch = await response.json();
        setProcessingBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));


        logAction('Processing Batch mark as Failed', `Batch ${batchId} was completed.`, {});
        await logProcessingEvent(batchId, `Batch ${batchId} marked as Failed by user.`);
        toast({ title: "Lote de Processamento Completo" });
      } catch(error) {
        console.error(error);
        toast({ title: "Erro", description: `Não foi possível completar o lote ${batchId}.`, variant: "destructive" });
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
                     if (!itemUpdateResponse.ok) throw new Error('Falha ao atualizar status do item');

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
            toast({title: "Alguns Itens Falharam", description: `Não foi possível mover os seguintes livros: ${failedBooks.join(', ')}. O lote permanece no estado 'Processado'.`, variant: "destructive"});
        } else {
            toast({ title: "Lotes Enviados", description: `${batchIds.length} lote(s) movido(s) para o Controle de Qualidade Final.` });
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
        if (!response.ok) throw new Error('Falha ao atualizar status do item de entrega.');

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

        toast({ title: `Livro Marcado como ${status}` });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Erro", description: error.message, variant: "destructive" });
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
            if (!response.ok) throw new Error('Falha ao finalizar lote via API.');

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
            toast({ title: "Validação Confirmada", description: "Todos os livros no lote foram processados." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Erro", description: error.message, variant: "destructive" });
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
            if (!response.ok) throw new Error('Falha ao distribuir amostra');

            const { batch, items } = await response.json();
            
            setDeliveryBatches(prev => prev.map(b => b.id === batch.id ? batch : b));
            setDeliveryBatchItems(prev => [...prev.filter(i => i.deliveryId !== batchId), ...items]);

            logAction('Validation Distributed', `${assignments.length} items from batch ${batchId} distributed.`, {});
            toast({ title: "Amostra Distribuída", description: "As tarefas foram atribuídas aos operadores." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Erro", description: error.message, variant: "destructive" });
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
      toast({ title: "Livro Arquivado" });
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
      toast({ title: "Livro Corrigido" });
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
      logAction('Book All Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
      toast({ title: "Todos os Livros Reenviados" });
    });
  };

    const handleResubmitCopyTifs = (bookId: string, targetStage: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book) return;
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;

      const moveResult = await copyTifsBookFolder(book.name, currentStatusName, targetStage);
      if (moveResult !== true) return;

      const updatedBook = await updateBookStatus(bookId, targetStage);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Book Copy Tifs Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
      toast({ title: "Reenvio de TIFs do Livro", description: `Livro "${book.name}" reenviado para ${targetStage}.` });
    });
  };


    const handleResubmitMoveTifs = (bookId: string, targetStage: string) => {
    withMutation(async () => {
      const book = rawBooks.find(b => b.id === bookId);
      if (!book) return;
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;

      const moveResult = await moveTifsBookFolder(book.name, currentStatusName, targetStage);
      if (moveResult !== true) return;

      const updatedBook = await updateBookStatus(bookId, targetStage);
      setRawBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      logAction('Book Move Tifs Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
      toast({ title: "Reenvio de TIFs do Livro", description: `Livro "${book.name}" reenviado para ${targetStage}.` });
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
        if (!response.ok) throw new Error('Falha ao criar lote de entrega');

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
        toast({ title: "Lote de Entrega Criado e Enviado" });
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível criar o lote de entrega.", variant: "destructive" });
      }
    });
  };
    const handlePullNextTask = React.useCallback(async (currentStageKey: string, userIdToAssign?: string) => {
    await withMutation(async () => {
        const assigneeId = userIdToAssign || currentUser?.id;
        if (!assigneeId) {
            toast({ title: "Erro", description: "Nenhum utilizador especificado para atribuição.", variant: "destructive" });
            return;
        }

        const user = users.find(u => u.id === assigneeId);
        if (!user) {
            toast({ title: "Erro", description: "Utilizador atribuído não encontrado.", variant: "destructive" });
            return;
        }
        
        const workflowConfig = STAGE_CONFIG[currentStageKey];
        if (!workflowConfig || !workflowConfig.assigneeRole) {
            toast({ title: "Erro de Workflow", description: "Fase inválida para puxar tarefas.", variant: "destructive" });
            return;
        }
        
        const localIP = await getLocalIP();        
        const accessibleStorageIds = storages
            .filter(s => s.ip === localIP)
            .map(s => String(s.id));

        if (accessibleStorageIds.length === 0 && (currentStageKey === 'to-indexing' || currentStageKey === 'to-checking')) {
            toast({ title: "Erro de Armazenamento", description: "Nenhum armazenamento acessível encontrado para o IP atual. Não é possível puxar tarefas de Indexação ou QC.", variant: "destructive" });
            return;
        }
        
        // --- INÍCIO DA LÓGICA MODIFICADA ---

        // 1. Determinar a lista de projetos a verificar
        const projectsToScan = selectedProjectId ? rawProjects.filter(p => p.id === selectedProjectId) : accessibleProjectsForUser;

        for (const project of projectsToScan) {
            const projectWorkflow = projectWorkflows[project.id] || [];
            const currentStageIndexInProjectWorkflow = projectWorkflow.indexOf(currentStageKey);

            if (currentStageIndexInProjectWorkflow > 0) {
                // 2. Encontrar o estágio anterior VÁLIDO dentro do workflow deste projeto
                const previousStageKey = projectWorkflow[currentStageIndexInProjectWorkflow - 1];
                const previousStageStatus = STAGE_CONFIG[previousStageKey]?.dataStatus;
                
                if (!previousStageStatus) continue; // Pula para o próximo projeto se o estágio anterior não for válido

                // 3. Procurar por um livro elegível DENTRO deste projeto
                const bookToAssign = enrichedBooks.find(b => 
                    b.projectId === project.id &&
                    b.status === previousStageStatus &&
                    !b[workflowConfig.assigneeRole! + 'UserId' as keyof EnrichedBook] &&
                    (
                      // A verificação de armazenamento só se aplica a certas fases
                      (currentStageKey !== 'to-indexing' && currentStageKey !== 'to-checking') ||
                      (b.storageId && accessibleStorageIds.includes(String(b.storageId)))
                    )
                );

                if (bookToAssign) {
                    // 4. Encontramos um! Atribuir e sair.
                    handleAssignUser(bookToAssign.id, assigneeId, workflowConfig.assigneeRole);
                    toast({ title: "Tarefa Obtida com Sucesso", description: `"${bookToAssign.name}" foi atribuído a si.` });
                    return; // Sair da função
                }
            }
        }
        
        // --- FIM DA LÓGICA MODIFICADA ---

        // Se o loop terminar sem encontrar nada
        toast({ title: "Sem Tarefas Disponíveis", description: "Não há livros não atribuídos disponíveis na etapa anterior para os seus projetos.", variant: "default" });
    });
  }, [currentUser, users, enrichedBooks, selectedProjectId, accessibleProjectsForUser, projectWorkflows, storages, handleAssignUser, toast]);
  const handlePullNextTask1 = React.useCallback(async (currentStageKey: string, userIdToAssign?: string) => {
    await withMutation(async () => {
        const assigneeId = userIdToAssign || currentUser?.id;
        if (!assigneeId) {
            toast({ title: "Erro", description: "Nenhum utilizador especificado para atribuição.", variant: "destructive" });
            return;
        }

        const user = users.find(u => u.id === assigneeId);
        if (!user) {
            toast({ title: "Erro", description: "Utilizador atribuído não encontrado.", variant: "destructive" });
            return;
        }
        
        const workflowConfig = STAGE_CONFIG[currentStageKey];
        if (!workflowConfig || !workflowConfig.assigneeRole) {
            toast({ title: "Erro de Workflow", description: "Fase inválida para puxar tarefas.", variant: "destructive" });
            return;
        }

        const currentIndex = WORKFLOW_SEQUENCE.indexOf(currentStageKey);
        if (currentIndex === -1 || currentIndex === 0) {
            toast({ title: "Erro de Workflow", description: "Não é possível puxar tarefa de uma fase inicial.", variant: "destructive" });
            return;
        }

        const previousStageKey = WORKFLOW_SEQUENCE[currentIndex - 1];
        const previousStageStatus = STAGE_CONFIG[previousStageKey]?.dataStatus;
        if (!previousStageStatus) {
            toast({ title: "Erro de Workflow", description: `Fase anterior (${previousStageKey}) não tem status definido.`, variant: "destructive" });
            return;
        }

        

        // ip da máquina apenas
        const localIP = await getLocalIP();        
        const accessibleStorageIds = storages
        .filter(s => s.ip === localIP)
        .map(s => s.id.toString());

        if (accessibleStorageIds.length === 0) {
            toast({ title: "Erro de Armazenamento", description: "Nenhum armazenamento acessível encontrado para o IP atual.", variant: "destructive" });
            return;
        }

        let bookToAssign = enrichedBooks.find(b => 
            b.status === previousStageStatus &&
            !b[workflowConfig.assigneeRole! + 'UserId' as keyof EnrichedBook] &&
            (!selectedProjectId || b.projectId === selectedProjectId) &&
            b.storageId && accessibleStorageIds.includes(b.storageId.toString()) // <-- NOVO FILTRO
        );

        /*
        let bookToAssign1 = enrichedBooks.find(b => 
            b.status === previousStageStatus &&
            !b[workflowConfig.assigneeRole! + 'UserId' as keyof EnrichedBook] && // Check if not already assigned for the target role
            (!selectedProjectId || b.projectId === selectedProjectId)
        );

        toast({
        title: "Books encontrados",
        description: (
          <pre>
             {`storages:\n${JSON.stringify(accessibleStorageIds, null, 2)}}`}
            {`booksToAssign:\n${JSON.stringify(bookToAssign, null, 2)}\n\nbooksToAssign1:\n${JSON.stringify(bookToAssign1, null, 2)}`}
          </pre>
        ),
        variant: "default",
      });
 */
        if (!bookToAssign) {
            toast({ title: "Sem Tarefas Disponíveis", description: "Não há livros não atribuídos na fase anterior.", variant: "default" });
            return;
        }

        handleAssignUser(bookToAssign.id, assigneeId, workflowConfig.assigneeRole);
        toast({ title: "Tarefa Puxada com Sucesso", description: `"${bookToAssign.name}" foi atribuído a ${user.name}.` });
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
    bookObservations,
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
    addBook, updateBook, deleteBook, importBooks, addBookObservation,
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
    handleFinalize, handleMarkAsCorrected, handleResubmit, handleResubmitCopyTifs, handleResubmitMoveTifs,
    addPageToBook, deletePageFromBook,
    updateDocumentFlag, startProcessingBatch, failureProcessingBatch, completeProcessingBatch, failProcessingBatch, handleSendBatchToNextStage,
    handleAssignUser, reassignUser, handleStartTask, handleCancelTask,
    openAppValidateScan,
    handleAdminStatusOverride, handleCreateDeliveryBatch, finalizeDeliveryBatch,
    distributeValidationSample,
    handleCompleteTask,handleCancelCompleteTask, handlePullNextTask,
    logAction,
    moveBookFolder,
    moveTifsBookFolder,
    copyTifsBookFolder,
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

    






