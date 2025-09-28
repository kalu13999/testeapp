

"use client"

import * as React from 'react';
import type { Client, User, Project, EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, AuditLog, ProcessingLog, Permissions, ProjectWorkflows, RejectionTag, DocumentStatus, ProcessingBatch, ProcessingBatchItem, Storage, LogTransferencia, ProjectStorage, Scanner, DeliveryBatch, DeliveryBatchItem, BookObservation } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { WORKFLOW_SEQUENCE, STAGE_CONFIG, findStageKeyFromStatus, getNextEnabledStage, StageConfigItem } from '@/lib/workflow-config';
import { UserFormValues } from '@/app/(app)/users/user-form';
import { StorageFormValues } from '@/app/(app)/admin/general-configs/storage-form';
import { ScannerFormValues } from '@/app/(app)/admin/general-configs/scanner-form';
import { format } from 'date-fns';
import { useClients } from '@/queries/useClients'
import { useUsers } from '@/queries/useUsers'
import { useRawProjects } from '@/queries/useRawProjects'
import { useRawBooks } from '@/queries/useRawBooks'
import { useRawDocuments } from '@/queries/useRawDocuments'
import { useAuditLogs } from '@/queries/useAuditLogs'
import { useBookObservations } from '@/queries/useBookObservations'
import { useProcessingBatches } from '@/queries/useProcessingBatches'
import { useProcessingBatchItems } from '@/queries/useProcessingBatchItems'
import { useProcessingLogs } from '@/queries/useProcessingLogs'
import { usePermissions } from '@/queries/usePermissions'
import { useRoles } from '@/queries/useRoles'
import { useProjectWorkflows } from '@/queries/useProjectWorkflows'
import { useRejectionTags } from '@/queries/useRejectionTags'
import { useStatuses } from '@/queries/useStatuses'
import { useStorages } from '@/queries/useStorages'
import { useScanners } from '@/queries/useScanners'
import { useTransferLogs } from '@/queries/useTransferLogs'
import { useProjectStorages } from '@/queries/useProjectStorages'
import { useDeliveryBatches } from '@/queries/useDeliveryBatches'
import { useDeliveryBatchItems } from '@/queries/useDeliveryBatchItems'
import { useQueryClient, useMutation, type QueryKey } from '@tanstack/react-query';
import * as queryKeys from '@/queries/keys';


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
  loadingPage: boolean;
  isMutating: boolean;
  isPageLoading: boolean;
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
  
  // Global Project Filter
  allProjects: EnrichedProject[];
  accessibleProjectsForUser: EnrichedProject[];
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;


  loadInitialData: (isSilent?: boolean) => Promise<void>;
  
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
  handleSendToStorage: (bookId: string, payload: { actualPageCount: number }) => Promise<void>;
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
  booksAvaiableInStorageLocalIp: (currentStageKey: string) => Promise<EnrichedBook[] | undefined>;
  logAction: (action: string, details: string, ids: { bookId?: string; documentId?: string; userId?: string; }) => Promise<void>;
  moveBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
  moveTifsBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
  copyTifsBookFolder: (bookName: string, fromStatusName: string, toStatusName: string) => Promise<boolean>;
  updateBookStatus: (bookId: string, newStatusName: string, additionalUpdates?: Partial<EnrichedBook>) => Promise<any>;
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

const OPERATOR_ROLES = ["Operator", "QC Specialist", "Reception", "Scanning", "Indexing", "Processing", "Delivery", "Correction Specialist", "Multi-Operator", "Supervisor"];

const getDbSafeDate = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const openLocalApp = (protocol: string, data: Record<string, string>) => {
  const queryString = new URLSearchParams(data).toString();
  const url = `${protocol}://start?${queryString}`;
  setTimeout(() => {
    window.location.href = url;
  }, 100);
};

type MutationVariables<TData, TVariables> = {
    mutationFn: (vars: TVariables) => Promise<TData | string | void>;
    optimisticUpdateFn?: (queryClient: any, variables: TVariables, context: any) => void;
    getPreviousDataFn?: (queryClient: any) => any;
    successMessage?: string;
    invalidateKeys?: (keyof typeof queryKeys)[];
} & TVariables;


export function AppProvider({ children }: { children: React.ReactNode; }) {
  const [isMutating, setIsMutating] = React.useState(false);
  const [isPageLoading, setIsPageLoading] = React.useState(true);
  const [processingBookIds, setProcessingBookIds] = React.useState<string[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = React.useState<NavigationHistoryItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: rawProjects, isLoading: isLoadingRawProjects } = useRawProjects();
  const { data: rawBooks, isLoading: isLoadingRawBooks } = useRawBooks();
  const { data: rawDocuments, isLoading: isLoadingRawDocuments } = useRawDocuments();
  const { data: auditLogs, isLoading: isLoadingAuditLogs } = useAuditLogs();
  const { data: bookObservations, isLoading: isLoadingBookObservations } = useBookObservations();
  const { data: processingBatches, isLoading: isLoadingProcessingBatches } = useProcessingBatches();
  const { data: processingBatchItems, isLoading: isLoadingProcessingBatchItems } = useProcessingBatchItems();
  const { data: processingLogs, isLoading: isLoadingProcessingLogs } = useProcessingLogs();
  const { data: deliveryBatches, isLoading: isLoadingDeliveryBatches } = useDeliveryBatches();
  const { data: deliveryBatchItems, isLoading: isLoadingDeliveryBatchItems } = useDeliveryBatchItems();
  const { data: roles, isLoading: isLoadingRoles } = useRoles();
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions();
  const { data: projectWorkflows, isLoading: isLoadingProjectWorkflows } = useProjectWorkflows();
  const { data: rejectionTags, isLoading: isLoadingRejectionTags } = useRejectionTags();
  const { data: statuses, isLoading: isLoadingStatuses } = useStatuses();
  const { data: storages, isLoading: isLoadingStorages } = useStorages();
  const { data: scanners, isLoading: isLoadingScanners } = useScanners();
  const { data: transferLogs, isLoading: isLoadingTransferLogs } = useTransferLogs();
  const { data: projectStorages, isLoading: isLoadingProjectStorages } = useProjectStorages();
  
  const loadingPage = 
    isLoadingClients || isLoadingUsers || isLoadingRawProjects || isLoadingRawBooks || 
    isLoadingRawDocuments || isLoadingAuditLogs || isLoadingBookObservations || isLoadingProcessingBatches ||
    isLoadingProcessingBatchItems || isLoadingProcessingLogs || isLoadingDeliveryBatches || 
    isLoadingDeliveryBatchItems || isLoadingRoles || isLoadingPermissions || 
    isLoadingProjectWorkflows || isLoadingRejectionTags || isLoadingStatuses ||
    isLoadingStorages || isLoadingScanners || isLoadingTransferLogs || isLoadingProjectStorages;

  // Restore current user on initial load
  React.useEffect(() => {
    if (!isLoadingUsers && users) {
      const storedUserId = localStorage.getItem('flowvault_userid');
      if (storedUserId) {
        const user = users.find(u => u.id === storedUserId);
        if (user) {
          setCurrentUser(user);
          const storedHistory = localStorage.getItem(`nav_history_${user.id}`);
          if (storedHistory) {
            setNavigationHistory(JSON.parse(storedHistory));
          }
        }
      }
    }
  }, [isLoadingUsers, users]);
  
  const loadInitialData = React.useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsPageLoading(true);
    }
    try {
      await queryClient.refetchQueries();
    } catch (error) {
      console.error("Failed to refetch data:", error);
      toast({ title: "Data Sync Failed", description: "Could not sync with the server.", variant: "destructive" });
    } finally {
      if (!isSilent) {
        setIsPageLoading(false);
      }
    }
  }, [queryClient, toast]);

  const mutation = useMutation({
    mutationFn: async (variables: { mutationFn: () => Promise<any> }) => {
      setIsMutating(true);
      return variables.mutationFn();
    },
    onMutate: async (variables: any) => {
      if (variables.optimisticUpdateFn) {
        await queryClient.cancelQueries();
        const previousData = variables.getPreviousDataFn ? variables.getPreviousDataFn(queryClient) : undefined;
        variables.optimisticUpdateFn(queryClient, variables, previousData);
        return { previousData };
      }
      return {};
    },
    onError: (error: any, variables: any, context: any) => {
      if (context?.previousData && variables.optimisticUpdateFn) {
        variables.optimisticUpdateFn(queryClient, variables, context.previousData);
      }
      toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    },
    onSuccess: (data, variables: any) => {
      if (typeof data === 'string') {
          toast({ title: data });
      } else if (variables.successMessage) {
          toast({ title: variables.successMessage });
      }
    },
    onSettled: (data, error, variables: any) => {
      if (variables.invalidateKeys) {
        variables.invalidateKeys.forEach((key: keyof typeof queryKeys) => {
          queryClient.invalidateQueries({ queryKey: queryKeys[key] });
        });
      }
      setIsMutating(false);
    },
  });

  const withMutation = React.useCallback(<TData, TVariables>(
    options: MutationVariables<TData, TVariables>
  ) => {
    const { mutationFn, ...rest } = options;
    return mutation.mutate({
        mutationFn: () => mutationFn(rest as TVariables),
        ...rest,
    });
  }, [mutation]);

  const login = async (username: string, password: string): Promise<User | null> => {
    const user = users?.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase() && u.password === password);
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
  
  const regLastLogin = async (user: User) => {
    withMutation({
      mutationFn: async () => {
        const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const response = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastLogin: now }),
        });
        if(!response.ok) throw new Error('Failed to register last login');
      },
      invalidateKeys: ['USERS']
    });
  };

  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean | undefined> => {
    return new Promise(resolve => {
        withMutation({
            mutationFn: async () => {
                const response = await fetch(`/api/users/${userId}/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword }),
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to change password.");
                }
                logAction('Password Changed', `User changed their password.`, { userId: userId });
                resolve(true);
            },
            invalidateKeys: ['USERS'],
            successMessage: "Palavra-passe alterada com sucesso",
            onError: () => resolve(false)
        });
    });
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

    const logData: Omit<AuditLog, 'id'> = {
        action,
        details,
        userId: actorId,
        date: getDbSafeDate(),
        bookId: ids.bookId,
        documentId: ids.documentId,
    };
    await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.AUDIT_LOGS });
  }, [currentUser, queryClient]);

  const enrichedAuditLogs: EnrichedAuditLog[] = React.useMemo(() => {
    return (auditLogs || []).map(log => ({
      ...log,
      user: users?.find(u => u.id === log.userId)?.name || log.userId,
    }));
  }, [auditLogs, users]);

  const documents: AppDocument[] = React.useMemo(() => {
    if (!rawDocuments || !rawBooks || !statuses || !clients) return [];
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
    if (!rawProjects || !clients || !rawBooks || !rawDocuments || !statuses || !storages || !transferLogs || !scanners) return [];
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
        
        const projectBooks = (rawBooks || []).filter(b => b.projectId === project.id).map(book => {
            const bookDocuments = (rawDocuments || []).filter(d => d.bookId === book.id);
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
    if (!currentUser || !allEnrichedProjects) return [];
    if (currentUser.clientId) {
      return allEnrichedProjects.filter(p => p.clientId === currentUser.clientId);
    }
    if (OPERATOR_ROLES.includes(currentUser.role) && currentUser.projectIds?.length) {
      const operatorProjectIds = new Set(currentUser.projectIds);
      return allEnrichedProjects.filter(p => operatorProjectIds.has(p.id));
    }
    return allEnrichedProjects;
  }, [allEnrichedProjects, currentUser]);


  const addClient = async (clientData: Omit<Client, 'id'>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData),
        });
        if (!response.ok) throw new Error('Falha ao criar cliente');
        const newClient = await response.json();
        logAction('Client Created', `New client "${newClient.name}" added.`, {});
      },
      invalidateKeys: ['CLIENTS'],
      successMessage: "Cliente Adicionado"
    });
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData),
        });
        if (!response.ok) throw new Error('Failed to update client');
        const updatedClient = await response.json();
        logAction('Client Updated', `Details for "${updatedClient.name}" updated.`, {});
      },
      invalidateKeys: ['CLIENTS'],
      successMessage: "Cliente Atualizado"
    });
  };

  const deleteClient = async (clientId: string) => {
    await withMutation({
      mutationFn: async () => {
        const clientToDelete = clients.find(c => c.id === clientId);
        const response = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
        if (!response.ok) {
            if (response.status === 409) {
                 toast({ title: "Falha na Eliminação", description: "Não é possível eliminar o cliente com projetos associados. Por favor, reatribua ou elimine os projetos primeiro.", variant: "destructive" });
                 return;
            }
            throw new Error('Falha ao eliminar cliente');
        }
        if (selectedProjectId && rawProjects?.find(p => p.id === selectedProjectId)?.clientId === clientId) {
          setSelectedProjectId(null);
        }
        logAction('Client Deleted', `Client "${clientToDelete?.name}" was deleted.`, {});
      },
      invalidateKeys: ['CLIENTS', 'RAW_PROJECTS', 'RAW_BOOKS', 'RAW_DOCUMENTS', 'REJECTION_TAGS'],
      successMessage: "Cliente Eliminado"
    });
  };
  
  const addUser = async (userData: UserFormValues) => {
    await withMutation({
      mutationFn: async () => {
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
        logAction('User Created', `New user "${newUser.name}" added with role ${newUser.role}.`, {});
      },
      invalidateKeys: ['USERS'],
      successMessage: "Utilizador Adicionado"
    });
  };

  const updateUser = async (userId: string, userData: Partial<User>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar utilizador');
        const updatedUser = await response.json();
        logAction('User Updated', `Details for user "${updatedUser.name}" updated.`, {});
      },
      invalidateKeys: ['USERS'],
      successMessage: "Utilizador Atualizado"
    });
  };
  
  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'System') return;
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) throw new Error('Falha ao alternar estado do utilizador');
        logAction('User Status Changed', `User "${user.name}" was ${newStatus}.`, {});
      },
      invalidateKeys: ['USERS'],
      successMessage: `Utilizador ${newStatus === 'active' ? 'Ativado' : 'Desativado'}`
    });
  };

  const deleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete || userToDelete.role === 'System') return;
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao eliminar utilizador');
        logAction('User Deleted', `User "${userToDelete?.name}" was deleted.`, {});
      },
      invalidateKeys: ['USERS'],
      successMessage: "Utilizador Eliminado"
    });
  };
  
  const updateUserDefaultProject = (userId: string, projectId: string | null) => {
    withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultProjectId: projectId }),
        });
        if (!response.ok) throw new Error("Falha ao atualizar o projeto padrão do utilizador.");
        const updatedUser = await response.json();
        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser);
        }
        logAction('Default Project Set', `Default project for user ${updatedUser.name} set.`, {});
      },
      invalidateKeys: ['USERS'],
      successMessage: "Projeto Padrão Atualizado"
    });
  };
  
  const addProject = async (projectData: Omit<Project, 'id'>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData),
        });
        if (!response.ok) throw new Error('Falha ao criar o projeto');
        const newProject = await response.json();
        logAction('Project Created', `New project "${newProject.name}" added.`, {});
      },
      invalidateKeys: ['RAW_PROJECTS', 'PROJECT_WORKFLOWS'],
      successMessage: "Projeto Adicionado"
    });
  };
  
  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id'>>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar o projeto');
        logAction('Project Updated', `Details for project "${projectData.name}" updated.`, {});
      },
      invalidateKeys: ['RAW_PROJECTS'],
      successMessage: "Projeto Atualizado"
    });
  };

  const deleteProject = async (projectId: string) => {
    await withMutation({
      mutationFn: async () => {
        const projectToDelete = rawProjects?.find(p => p.id === projectId);
        const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao eliminar projeto');
        if (selectedProjectId === projectId) setSelectedProjectId(null);
        logAction('Project Deleted', `Project "${projectToDelete?.name}" was deleted.`, {});
      },
      invalidateKeys: ['RAW_PROJECTS', 'RAW_BOOKS', 'RAW_DOCUMENTS'],
      successMessage: "Projeto Eliminado"
    });
  };

  const addBook = async (projectId: string, bookData: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => {
    await withMutation({
      mutationFn: async () => {
        const statusId = statuses?.find(s => s.name === 'Pending Shipment')?.id;
        if (!statusId) throw new Error("Não foi possível encontrar o estado 'Envio Pendente'.");
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, book: {...bookData, statusId } }),
        });
        if (!response.ok) throw new Error('Falha ao criar livro');
        const newRawBook = await response.json();
        logAction('Book Added', `Book "${newRawBook.name}" was added to project.`, { bookId: newRawBook.id });
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Livro Adicionado"
    });
  };
  
  const updateBook = async (bookId: string, bookData: Partial<Omit<RawBook, 'id' | 'projectId' | 'statusId'>>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar livro');
        const updatedRawBook = await response.json();
        logAction('Book Updated', `Details for book "${updatedRawBook.name}" were updated.`, { bookId });
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Livro Atualizado"
    });
  };

  const deleteBook = async (bookId: string) => {
    await withMutation({
      mutationFn: async () => {
        const bookToDelete = rawBooks?.find(b => b.id === bookId);
        const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao eliminar livro');
        logAction('Book Deleted', `Book "${bookToDelete?.name}" and its pages were deleted.`, { bookId });
      },
      invalidateKeys: ['RAW_BOOKS', 'RAW_DOCUMENTS', 'AUDIT_LOGS'],
      successMessage: "Livro Eliminado"
    });
  };

  const importBooks = async (projectId: string, newBooks: BookImport[]) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, books: newBooks }),
        });
        if (!response.ok) throw new Error('Falha ao importar livros');
        const createdBooks = await response.json();
        logAction('Books Imported', `${createdBooks.length} books imported for project.`, {});
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Importação Bem-Sucedida"
    });
  };

  const addBookObservation = async (bookId: string, observation: string) => {
    if (!currentUser) return;
    await withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        const bookStatus = statuses?.find(s => s.id === book?.statusId)?.name;

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
        logAction('Observation Added', `Observation added to book.`, { bookId });
      },
      invalidateKeys: ['BOOK_OBSERVATIONS'],
      successMessage: "Observação Adicionada"
    });
  };

  const addRole = (roleName: string, rolePermissions: string[]) => {
    withMutation({
      mutationFn: async () => {
      if (roles?.includes(roleName)) {
        toast({ title: "Perfil Já Existe", description: "Já existe um perfil com este nome.", variant: "destructive" });
        return;
      }
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName, permissions: rolePermissions }),
      });
      if (!response.ok) throw new Error('Falha ao guardar perfil.');
      logAction('Role Created', `New role "${roleName}" was created.`, {});
      },
      invalidateKeys: ['ROLES', 'PERMISSIONS'],
      successMessage: "Perfil Criado"
    });
  };

  const updateRole = (roleName: string, rolePermissions: string[]) => {
    withMutation({
      mutationFn: async () => {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName, permissions: rolePermissions }),
      });
      if (!response.ok) throw new Error('Falha ao guardar permissões no banco de dados.');
      logAction('Role Updated', `Permissions for role "${roleName}" were updated.`, {});
    }, 
    invalidateKeys: ['PERMISSIONS'],
    successMessage: "Perfil Atualizado"});
  };
  
  const deleteRole = (roleName: string) => {
    withMutation({
      mutationFn: async () => {
      const response = await fetch('/api/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName }),
      });
      if (!response.ok) throw new Error('Falha ao eliminar perfil.');
      logAction('Role Deleted', `Role "${roleName}" was deleted.`, {});
    }, 
    invalidateKeys: ['ROLES', 'PERMISSIONS', 'USERS'],
    successMessage: "Perfil Eliminado"
    });
  };

  const updateProjectWorkflow = (projectId: string, workflow: string[]) => {
    withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/project-workflows/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow }),
        });
        if (!response.ok) throw new Error("Falha ao atualizar o fluxo de trabalho no servidor.");
        logAction('Project Workflow Updated', `Workflow for project ID ${projectId} was updated.`, {});
      },
      invalidateKeys: ['PROJECT_WORKFLOWS'],
      successMessage: "Fluxo de Trabalho do Projeto Atualizado"
    });
  };

  const addRejectionTag = async (tagData: Omit<RejectionTag, 'id' | 'clientId'>, clientId: string) => {
    await withMutation({
      mutationFn: async () => {
        if (!clientId) throw new Error("ID do Cliente está ausente");
        const response = await fetch('/api/rejection-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tagData, clientId }),
        });
        if (!response.ok) throw new Error('Falha ao criar tag de rejeição');
        const newTag = await response.json();
        const client = clients?.find(c => c.id === clientId);
        logAction('Rejection Tag Created', `Tag "${newTag.label}" criada para o cliente "${client?.name}".`, {});
      },
      invalidateKeys: ['REJECTION_TAGS'],
      successMessage: "Motivo de Rejeição Adicionado"
    });
  };

  const updateRejectionTag = async (tagId: string, tagData: Partial<Omit<RejectionTag, 'id' | 'clientId'>>) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/rejection-tags/${tagId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tagData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar tag de rejeição');
        const updatedTag = await response.json();
        logAction('Rejection Tag Updated', `Tag "${updatedTag.label}" updated.`, {});
      },
      invalidateKeys: ['REJECTION_TAGS'],
      successMessage: "Motivo de Rejeição Atualizado"
    });
  };

  const deleteRejectionTag = async (tagId: string) => {
    await withMutation({
      mutationFn: async () => {
        const tag = rejectionTags?.find(t => t.id === tagId);
        const response = await fetch(`/api/rejection-tags/${tagId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao eliminar etiqueta de rejeição');
        logAction('Rejection Tag Deleted', `Tag "${tag?.label}" deleted.`, {});
      },
      invalidateKeys: ['REJECTION_TAGS'],
      successMessage: "Etiqueta de Rejeição Eliminada"
    });
  };

  const addStorage = async (storageData: StorageFormValues) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/storages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storageData),
        });
        if (!response.ok) throw new Error('Falha ao criar Armazenamento');
        const newStorage = await response.json();
        logAction('Storage Created', `New storage location "${newStorage.nome}" added.`, {});
      },
      invalidateKeys: ['STORAGES'],
      successMessage: "Armazenamento Adicionado"
    });
  };

  const updateStorage = async (storageId: string, storageData: StorageFormValues) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/storages/${storageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storageData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar o armazenamento');
        const updatedStorage = await response.json();
        logAction('Storage Updated', `Storage location "${updatedStorage.nome}" updated.`, {});
      },
      invalidateKeys: ['STORAGES'],
      successMessage: "Armazenamento Atualizado"
    });
  };

  const deleteStorage = async (storageId: string) => {
    await withMutation({
      mutationFn: async () => {
        const storage = storages?.find(s => s.id === Number(storageId));
        const response = await fetch(`/api/storages/${storageId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao eliminar armazenamento');
        logAction('Storage Deleted', `Storage location "${storage?.nome}" deleted.`, {});
      },
      invalidateKeys: ['STORAGES', 'PROJECT_STORAGES'],
      successMessage: "Armazenamento Eliminado"
    });
  };
  
  const addScanner = async (scannerData: ScannerFormValues) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/scanners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scannerData),
        });
        if (!response.ok) throw new Error('Falha ao criar scanner');
        const newScanner = await response.json();
        logAction('Scanner Created', `New scanner "${newScanner.nome}" added.`, {});
      },
      invalidateKeys: ['SCANNERS'],
      successMessage: "Scanner Adicionado"
    });
  };

  const updateScanner = async (scannerId: number, scannerData: ScannerFormValues) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/scanners/${scannerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scannerData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar scanner');
        const updatedScanner = await response.json();
        logAction('Scanner Updated', `Scanner "${updatedScanner.nome}" updated.`, {});
      },
      invalidateKeys: ['SCANNERS'],
      successMessage: "Scanner Atualizado"
    });
  };

  const deleteScanner = async (scannerId: number) => {
    await withMutation({
      mutationFn: async () => {
        const scanner = scanners?.find(s => s.id === scannerId);
        const response = await fetch(`/api/scanners/${scannerId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao eliminar scanner');
        logAction('Scanner Deleted', `Scanner "${scanner?.nome}" deleted.`, {});
      },
      invalidateKeys: ['SCANNERS'],
      successMessage: "Scanner Eliminado"
    });
  };
  
  const addProjectStorage = async (associationData: Omit<ProjectStorage, 'projectId'> & {projectId: string}) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/project-storages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(associationData),
        });
        if (!response.ok) throw new Error('Falha ao adicionar associação de armazenamento ao projeto');
        logAction('Project Storage Added', `Storage associated with project.`, {});
      },
      invalidateKeys: ['PROJECT_STORAGES'],
      successMessage: "Associação Adicionada"
    });
  };

  const updateProjectStorage = async (associationData: Omit<ProjectStorage, 'projectId'> & {projectId: string}) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/project-storages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(associationData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar associação de armazenamento do projeto');
        logAction('Project Storage Updated', `Association for project ${associationData.projectId} updated.`, {});
      },
      invalidateKeys: ['PROJECT_STORAGES'],
      successMessage: "Associação Atualizada"
    });
  };

  const deleteProjectStorage = async (projectId: string, storageId: number) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/project-storages', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, storageId }),
        });
        if (!response.ok) throw new Error('Falha ao eliminar associação de armazenamento do projeto');
        logAction('Project Storage Removed', `Association between project ${projectId} and storage ${storageId} removed.`, {});
      },
      invalidateKeys: ['PROJECT_STORAGES'],
      successMessage: "Associação Eliminada"
    });
  };


  const updateDocument = async (docId: string, data: Partial<AppDocument>) => {
    await withMutation({
      mutationFn: async () => {
        const doc = rawDocuments?.find(d => d.id === docId);
        if (!doc) return;
        const response = await fetch(`/api/documents/${docId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Falha ao atualizar documento');
        
        let logDetails = `Document "${doc.name}" updated.`;
        if (data.tags) logDetails = `Tags for document "${doc.name}" updated to: ${data.tags.join(', ') || 'None'}.`;
        if (data.flag !== undefined) logDetails = `Flag for document "${doc.name}" set to ${data.flag || 'None'}.`;
        logAction('Document Updated', logDetails, { documentId: docId, bookId: doc.bookId ?? undefined });
      },
      invalidateKeys: ['RAW_DOCUMENTS'],
      successMessage: "Documento Atualizado"
    });
  };
  
  const tagPageForRejection = async (pageId: string, tags: string[]) => {
      await updateDocument(pageId, { tags });
  };

  const updateDocumentFlag = async (docId: string, flag: AppDocument['flag'], comment?: string) => await updateDocument(docId, { flag, flagComment: flag ? comment : undefined });
  
  const addPageToBook = async (bookId: string, position: number) => {
    await withMutation({
      mutationFn: async () => {
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
        const response = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPage) });
        if (!response.ok) throw new Error('Falha ao adicionar página');
        
        logAction('Page Added', `New page added to "${book.name}" at position ${position}.`, { bookId, documentId: newPageId });
      },
      invalidateKeys: ['RAW_DOCUMENTS', 'RAW_BOOKS'],
      successMessage: "Página Adicionada"
    });
  }

  const deletePageFromBook = async (pageId: string, bookId: string) => {
    await withMutation({
      mutationFn: async () => {
          const page = rawDocuments?.find(p => p.id === pageId);
          const response = await fetch(`/api/documents/${pageId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Falha ao eliminar página');
          logAction('Page Deleted', `Page "${page?.name}" was deleted from book.`, { bookId, documentId: pageId });
      },
      invalidateKeys: ['RAW_DOCUMENTS', 'RAW_BOOKS'],
      successMessage: "Página Eliminada"
    });
  };

  const updateBookStatus = React.useCallback(async (
    bookId: string, newStatusName: string, additionalUpdates: Partial<RawBook> = {}
  ) => {
    const statusId = statuses?.find(s => s.name === newStatusName)?.id;
    if (!statusId) throw new Error(`Status ${newStatusName} not found.`);
    const response = await fetch(`/api/books/${bookId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statusId, ...additionalUpdates }) });
    if (!response.ok) {
      throw new Error(`Falha ao atualizar o estado do livro: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }, [statuses]);

  const moveBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
    const fromStatus = statuses?.find(s => s.name === fromStatusName);
    const toStatus = statuses?.find(s => s.name === toStatusName);
    if (!fromStatus || !toStatus) {
        toast({ title: "Erro de Configuração do Fluxo de Trabalho", variant: "destructive" });
        return false;
    }
    if (!fromStatus.folderName || !toStatus.folderName) return true; 
    
    const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
    if (!apiUrl) return true;
    
    try {
        const response = await fetch(`${apiUrl}/api/workflow/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookName, fromStatus: fromStatusName, toStatus: toStatusName }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao mover pasta.');
        }
        return true;
    } catch (error: any) {
        toast({ title: "Erro ao Mover Pasta", description: error.message, variant: "destructive" });
        return false;
    }
  }, [statuses, toast]);
  
  const moveTifsBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
    const fromStatus = statuses?.find(s => s.name === fromStatusName);
    const toStatus = statuses?.find(s => s.name === toStatusName);
    if (!fromStatus || !toStatus || !fromStatus.folderName || !toStatus.folderName) return true; 
    
    const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
    if (!apiUrl) return true;
    
    try {
      const response = await fetch(`${apiUrl}/api/workflow/move-tifs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookName, fromStatus: fromStatusName, toStatus: toStatusName }),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao mover TIFFs.');
      }
      return true;
    } catch (error: any) {
      toast({ title: "Erro ao Mover TIFFs", description: error.message, variant: "destructive" });
      return false;
    }
  }, [statuses, toast]);


  const copyTifsBookFolder = React.useCallback(async (bookName: string, fromStatusName: string, toStatusName: string): Promise<boolean> => {
    const fromStatus = statuses?.find(s => s.name === fromStatusName);
    const toStatus = statuses?.find(s => s.name === toStatusName);
    if (!fromStatus || !toStatus || !fromStatus.folderName || !toStatus.folderName) return true; 
    
    const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
    if (!apiUrl) return true;
    
    try {
      const response = await fetch(`${apiUrl}/api/workflow/copy-tifs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookName, fromStatus: fromStatusName, toStatus: toStatusName }),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao copiar TIFFs.');
      }
      return true;
    } catch (error: any) {
      toast({ title: "Erro ao Copiar TIFFs", description: error.message, variant: "destructive" });
      return false;
    }
  }, [statuses, toast]);

  const handleMarkAsShipped = (bookIds: string[]) => {
    withMutation({
      mutationFn: async () => {
        for (const bookId of bookIds) {
          await updateBookStatus(bookId, 'In Transit');
          logAction('Book Shipped', `Client marked book as shipped.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: `${bookIds.length} Livro(s) Marcado(s) como Enviado(s)`
    });
  };

  const handleConfirmReception = (bookId: string) => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book) return;
        const moveResult = await moveBookFolder(book.name, 'In Transit', 'Received');
        if (moveResult) {
          await updateBookStatus(bookId, 'Received');
          logAction('Reception Confirmed', `Book "${book.name}" has been marked as received.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Recepção Confirmada"
    });
  };
  
  const handleSendToStorage = async (bookId: string, payload: { actualPageCount: number }) => {
    setProcessingBookIds(prev => [...prev, bookId]);
    try {
        await withMutation({
          mutationFn: async () => {
            const book = rawBooks?.find(b => b.id === bookId);
            const project = rawProjects?.find(p => p.id === book?.projectId);
            if (!book || !project) throw new Error("Livro ou Projeto não encontrado");

            const response = await fetch(`/api/books/${bookId}/complete-scan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payload, bookName: book.name, clientId: project.clientId, projectId: book.projectId })
            });
            if (!response.ok) throw new Error(await response.text());
            
            const currentStatusName = statuses?.find(s => s.id === book.statusId)?.name || 'Unknown';
            const logMessage = findStageKeyFromStatus(currentStatusName) === 'already-received' ? 'Reception & Scan Skipped' : 'Scanning Finished';
            logAction(logMessage, `${payload.actualPageCount} pages created. Book "${book.name}" moved to Storage.`, { bookId });
          },
          invalidateKeys: ['RAW_BOOKS', 'RAW_DOCUMENTS'],
          successMessage: "Tarefa Completa"
        });
    } catch(error) {
        console.error("Error in handleSendToStorage:", error);
    } finally {
        setProcessingBookIds(prev => prev.filter(id => id !== bookId));
    }
  };

  const handleMoveBookToNextStage = React.useCallback(async (bookId: string, currentStatus: string): Promise<boolean> => {
    const book = rawBooks?.find(b => b.id === bookId);
    if (!book || !book.projectId || !projectWorkflows || !statuses) return false;

    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(currentStatus);
    if (!currentStageKey) return false;

    const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
    const newStatusName = nextStageKey ? (STAGE_CONFIG[nextStageKey]?.dataStatus || 'Unknown') : 'Complete';
    if (newStatusName === 'Unknown') return false;

    const moveResult = await moveBookFolder(book.name, currentStatus, newStatusName);
    if (moveResult) {
      await updateBookStatus(bookId, newStatusName);
      logAction('Workflow Step', `Book "${book.name}" moved from ${currentStatus} to ${newStatusName}.`, { bookId });
      queryClient.invalidateQueries({queryKey: queryKeys.RAW_BOOKS});
    }
    return moveResult;
  }, [rawBooks, projectWorkflows, statuses, updateBookStatus, moveBookFolder, logAction, queryClient]);


  const handleAssignUser = (bookId: string, userId: string, role: 'scanner' | 'indexer' | 'qc') => {
    withMutation({
      mutationFn: async () => {
        const user = users?.find(u => u.id === userId);
        const book = rawBooks?.find(b => b.id === bookId);
        if (!user || !book || !book.projectId || !statuses) return;

        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        const currentStageKey = findStageKeyFromStatus(currentStatusName);
        if (!currentStageKey) return;
        
        const nextStageKey = getNextEnabledStage(currentStageKey, projectWorkflows?.[book.projectId] || []);
        if (!nextStageKey) return;
        const newStatusName = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Unknown';
        if(newStatusName === 'Unknown') return;
        
        const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
        if (!moveResult) return;
        
        let updates: Partial<RawBook> = {};
        if (role === 'scanner') updates.scannerUserId = userId;
        else if (role === 'indexer') updates.indexerUserId = userId;
        else if (role === 'qc') updates.qcUserId = userId;
        
        await updateBookStatus(bookId, newStatusName, updates);
        logAction('Task Assigned', `Book "${book.name}" assigned to ${user.name} for ${newStatusName}.`, { bookId });
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Livro Atribuído"
    });
  };

  const reassignUser = (bookId: string, newUserId: string, role: 'scanner' | 'indexer' | 'qc') => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        const newUser = users?.find(u => u.id === newUserId);
        if (!book || !newUser) return;
        const updateField: 'scannerUserId' | 'indexerUserId' | 'qcUserId' = `${role}UserId`;
        await updateBook(bookId, { [updateField]: newUserId });
        const oldUser = users.find(u => u.id === book[updateField]);
        logAction('User Reassigned', `Task for book "${book.name}" was reassigned from ${oldUser?.name || 'Unassigned'} to ${newUser.name}.`, { bookId });
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Utilizador Reatribuído"
    });
  };
  
  const getLocalIP = async (): Promise<string> => {
    let localIP = "IP não identificado";
    try {
      const res = await fetch("/api/getip");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      localIP = data.ip;
    } catch (err) {
      console.error("Erro ao buscar IP:", err);
    }
    return localIP;
  };

  const openAppValidateScan = (bookId: string) => {
    withMutation({
      mutationFn: async () => {
      const book = rawBooks?.find(b => b.id === bookId);
      if (!book || !book.projectId || !currentUser) return;

      const localIP = await getLocalIP();
      const matchingScanners = scanners?.filter(s => s.ip === localIP);

      if (!matchingScanners || matchingScanners.length === 0) {
        toast({
          title: "Scanner Não Encontrado",
          description: `Não foi possível encontrar nenhum scanner para o seu IP atual ${localIP}.`,
          variant: "destructive"
        });
        return;
      }
      
      const scanner = matchingScanners[0];
      logAction("Scanning Validation", `Validation process started for book.`, { bookId });
      openLocalApp("rfs-check-app", { 
        userId: currentUser.id, 
        bookId: book.id, 
        bookDirectory: `${scanner.scanner_root_folder}/${book.name}`
      });
      }
    });
  };

  const handleStartTask = (bookId: string, role: 'scanner' | 'indexer' | 'qc') => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book || !book.projectId || !currentUser || !statuses || !rawProjects || !transferLogs || !storages || !scanners) return;
        
        let updates: Partial<RawBook> = {};
        let newStatusName = '';
        let logMsg = '';
        let appProtocol = '';
        let bookDirectory = '';
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        
        if (role === 'scanner') {
            newStatusName = 'Scanning Started';
            updates = { scanStartTime: getDbSafeDate() };
            logMsg = 'Scanning Started';
        } else {
            const currentStageKey = findStageKeyFromStatus(currentStatusName);
            if (!currentStageKey) return;
            const nextStageKey = getNextEnabledStage(currentStageKey, projectWorkflows?.[book.projectId] || []);
            if (!nextStageKey) return;
            newStatusName = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Unknown';
            if(newStatusName === 'Unknown') return;

            const newStageFolder = statuses.find(s => s.name === newStatusName)?.folderName;
            if(!newStageFolder) throw new Error("Pasta da etapa não encontrada");

            const project = rawProjects.find(p => p.id === book.projectId);
            if(!project) throw new Error("Projeto não encontrado");
            
            const log = transferLogs.find(l => l.bookId === bookId && l.status === 'sucesso');
            if(!log) throw new Error("Log de transferência não encontrado");

            const storage = storages.find(s => s.id === Number(log.storage_id));
            if(!storage) throw new Error("Armazenamento não encontrado");

            const scanner = scanners.find(s => s.id === Number(log.scanner_id));
            if(!scanner) throw new Error("Scanner não encontrado");

            const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
            if (!moveResult) return;

            if (role === 'indexer') {
                updates = { indexingStartTime: getDbSafeDate() };
                logMsg = 'Indexing Started';
                appProtocol = 'rfs-indexing-app';
                bookDirectory = `${storage.root_path}/${newStageFolder}/${project.name}/${book.name}`;
            } else if (role === 'qc') {
                updates = { qcStartTime: getDbSafeDate() };
                logMsg = 'Checking Started';
                appProtocol = 'rfs-check-app';
                bookDirectory = `${storage.root_path}/${newStageFolder}/${project.name}/${scanner.nome}/${book.name}`;
            }
        }

        await updateBookStatus(bookId, newStatusName, updates);
        logAction(logMsg, `${logMsg} process initiated for book.`, { bookId });
        
        if (appProtocol) {
            openLocalApp(appProtocol, { userId: currentUser.id, bookId: book.id, bookDirectory });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Tarefa iniciada"
    });
  };
  
  const handleCompleteTask = async (bookId: string, stage: string) => {
    await withMutation({
      mutationFn: async () => {
      const updateFields: { [key: string]: Partial<RawBook> } = {
        'Scanning Started': { scanEndTime: getDbSafeDate() },
        'Indexing Started': { indexingEndTime: getDbSafeDate() },
        'Checking Started': { qcEndTime: getDbSafeDate() },
      };

      let msgfinal = "";
      if(stage === 'Scanning Started'){
        const book = rawBooks?.find(b => b.id === bookId);
        const apiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
        const localIP = await getLocalIP();
        const response = await fetch(`${apiUrl}/api/scan/count-tifs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookName: book?.name, scanIp: localIP }),
        });
        if (!response.ok) throw new Error(`Falha ao contar TIFFs: ${await response.text()}`);
        const data = await response.json();
        await updateBook(bookId, { expectedDocuments: data.tifCount });
        msgfinal = `Todos os TIFs para "${data.bookName}" foram contados com sucesso. Total: ${data.tifCount}.`;
      }

      const update = updateFields[stage];
      if (update) {
        await updateBook(bookId, update);
        const book = rawBooks?.find(b => b.id === bookId);
        logAction('Task Completed', `Task "${stage}" completed for book "${book?.name}".`, { bookId });
      }
      return msgfinal;
    },
    invalidateKeys: ['RAW_BOOKS'],
    successMessage: "Tarefa Completa"});
  };

  const handleCancelCompleteTask = async (bookId: string, stage: string) => {
    await withMutation({
      mutationFn: async () => {
      const updateFields: { [key: string]: Partial<RawBook> } = {
        'Scanning Started': { scanEndTime: null },
        'Indexing Started': { indexingEndTime: null },
        'Checking Started': { qcEndTime: null },
      };
      const update = updateFields[stage];
      if (update) {
        await updateBook(bookId, update);
        const book = rawBooks?.find(b => b.id === bookId);
        logAction('Task Completion Cancelled', `Task "${stage}" cancelled for book "${book?.name}".`, { bookId });
      }
    }, invalidateKeys: ['RAW_BOOKS'], successMessage: "Tarefa em Espera"});
  };

  const handleCancelTask = (bookId: string, currentStatus: string) => {
    withMutation({
      mutationFn: async () => {
      const book = rawBooks?.find(b => b.id === bookId);
      if (!book || !statuses) return;
      const updates: { [key: string]: { bookStatus: string, logMsg: string, clearFields: Partial<RawBook> } } = {
        'Scanning Started': { bookStatus: 'To Scan', logMsg: 'Scanning', clearFields: { scanStartTime: undefined } },
        'Indexing Started': { bookStatus: 'To Indexing', logMsg: 'Indexing', clearFields: { indexingStartTime: undefined } },
        'Checking Started': { bookStatus: 'To Checking', logMsg: 'Checking', clearFields: { qcStartTime: undefined } },
      };
      const updateKey = Object.keys(updates).find(key => currentStatus.startsWith(key));
      if (!updateKey) return;
      const update = updates[updateKey];
      const moveResult = await moveBookFolder(book.name, currentStatus, update.bookStatus);
      if (moveResult) {
        await updateBookStatus(bookId, update.bookStatus, update.clearFields);
        logAction('Task Cancelled', `${update.logMsg} for book "${book.name}" was cancelled.`, { bookId });
      }
    }, invalidateKeys: ['RAW_BOOKS'], successMessage: 'Tarefa Cancelada'});
  };
  
  const handleAdminStatusOverride = (bookId: string, newStatusName: string, reason: string) => {
    withMutation({
      mutationFn: async () => {
      const book = rawBooks?.find(b => b.id === bookId);
      const newStatus = statuses?.find(s => s.name === newStatusName);
      if (!book || !newStatus || !statuses) return;
      const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
      if (!currentStatusName) return;
      const newStageKey = findStageKeyFromStatus(newStatus.name);
      const newStageConfig = newStageKey ? STAGE_CONFIG[newStageKey] : null;
      const updates: Partial<RawBook> = {};
      if (newStageConfig?.assigneeRole !== 'scanner') { updates.scannerUserId = undefined; updates.scanStartTime = undefined; updates.scanEndTime = undefined; }
      if (newStageConfig?.assigneeRole !== 'indexer') { updates.indexerUserId = undefined; updates.indexingStartTime = undefined; updates.indexingEndTime = undefined; }
      if (newStageConfig?.assigneeRole !== 'qc') { updates.qcUserId = undefined; updates.qcStartTime = undefined; updates.qcEndTime = undefined; }
      
      const moveResult = await moveBookFolder(book.name, currentStatusName, newStatus.name);
      if (moveResult) {
        await updateBookStatus(bookId, newStatus.name, updates);
        logAction('Admin Status Override', `Status of "${book.name}" manually changed to "${newStatus.name}". Reason: ${reason}`, { bookId });
      }
    }, invalidateKeys: ['RAW_BOOKS'], successMessage: "Status Sobrescrito"});
  };

  const logProcessingEvent = React.useCallback(async (batchId: string, message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO') => {
    await fetch('/api/processing-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, message, level }),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.PROCESSING_LOGS });
  }, [queryClient]);

  const startProcessingBatch = async (bookIds: string[], storageId: string) => {
    withMutation({
      mutationFn: async () => {
        if (!currentUser) throw new Error("Utilizador atual não encontrado.");
        
        const fromStatusName = 'Ready for Processing';
        const toStatusName = 'In Processing';
        for (const bookId of bookIds) {
          const book = rawBooks?.find(b => b.id === bookId);
          if (book) {
            const moveResult = await moveBookFolder(book.name, fromStatusName, toStatusName);
            if (!moveResult) throw new Error(`Falha ao mover a pasta do livro "${book.name}". Início do lote abortado.`);
          }
        }

        const response = await fetch('/api/processing-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds }),
        });
        if (!response.ok) throw new Error('Falha ao criar lote de processamento');
        const newBatch = await response.json();
        
        const storage = storages?.find(s => String(s.id) === storageId);
        if (!storage) throw new Error(`Armazenamento com ID ${storageId} não encontrado.`);

        const firstBook = rawBooks?.find(b => b.id === bookIds[0]);
        if (!firstBook) throw new Error("Não foi possível encontrar o livro para determinar o ID do projeto.");
        const projectId = firstBook.projectId;

        openLocalApp('rfs-processa-app', {
          userId: currentUser.id,
          batchId: newBatch.id,
          batchName: newBatch.timestampStr,
          projectId: projectId,
          storageId: storageId,
          rootPath: storage.root_path,
        });

        await logAction('Processing Batch Started', `Batch ${newBatch.id} started with ${bookIds.length} books.`, {});
        await logProcessingEvent(newBatch.id, `Batch ${newBatch.id} started with ${bookIds.length} books.`);
      },
      invalidateKeys: ['PROCESSING_BATCHES', 'RAW_BOOKS'],
      successMessage: "Lote de Processamento Iniciado"
    });
  };

  const failureProcessingBatch = async (batchId: string, storageId: string) => {
    withMutation({
      mutationFn: async () => {
        const batch = processingBatches?.find(b => b.id === batchId);
        if (!batch || !currentUser) throw new Error("Lote ou utilizador não encontrado.");
        
        await logAction('Processing Batch Retry', `User retrying failed batch ${batch.id}.`, { userId: currentUser.id });
        await logProcessingEvent(batch.id, `User ${currentUser.name} initiated a retry for this failed batch.`);
        
        const storage = storages?.find(s => String(s.id) === storageId);
        if (!storage) throw new Error(`Armazenamento com ID ${storageId} não encontrado.`);

        const firstItemInBatch = processingBatchItems?.find(item => item.batchId === batchId);
        if (!firstItemInBatch) throw new Error("Não foi possível encontrar itens para este lote.");
        
        const book = rawBooks?.find(b => b.id === firstItemInBatch.bookId);
        if (!book) throw new Error(`Não foi possível encontrar o livro com ID ${firstItemInBatch.bookId}.`);
        
        openLocalApp('rfs-processa-app', {
          userId: currentUser.id,
          batchId: batch.id,
          batchName: batch.timestampStr,
          projectId: book.projectId,
          storageId: storageId,
          rootPath: storage.root_path,
        });
      },
      invalidateKeys: [],
      successMessage: "A Reiniciar Lote..."
    });
  };

  const completeProcessingBatch = async (batchId: string) => {
    withMutation({
      mutationFn: async () => {
        const batch = processingBatches?.find(b => b.id === batchId);
        if (!batch) return;
        
        const itemsInBatch = (processingBatchItems || []).filter(i => i.batchId === batchId);
        const bookIdsInBatch = itemsInBatch.map(i => i.bookId);

        const response = await fetch(`/api/processing-batches/${batchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Complete', endTime: getDbSafeDate(), progress: 100 }),
        });
        if (!response.ok) throw new Error('Falha ao atualizar lote');

        for (const bookId of bookIdsInBatch) {
            await handleMoveBookToNextStage(bookId, 'In Processing');
        }

        logAction('Processing Batch Completed', `Batch ${batchId} was completed.`, {});
        await logProcessingEvent(batchId, `Batch ${batchId} marked as completed by user.`);
      },
      invalidateKeys: ['PROCESSING_BATCHES', 'RAW_BOOKS', 'PROCESSING_BATCH_ITEMS'],
      successMessage: "Lote de Processamento Completo"
    });
  };
  
  const failProcessingBatch = async (batchId: string) => {
    withMutation({
      mutationFn: async () => {
        const response = await fetch(`/api/processing-batches/${batchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Failed', endTime: getDbSafeDate()}),
        });
        if (!response.ok) throw new Error('Falha ao atualizar lote');
        logAction('Processing Batch mark as Failed', `Batch ${batchId} was failed.`, {});
        await logProcessingEvent(batchId, `Batch ${batchId} marked as Failed by user.`);
      },
      invalidateKeys: ['PROCESSING_BATCHES'],
      successMessage: "Lote Marcado como Falha"
    });
  };
  
  const handleSendBatchToNextStage = async (batchIds: string[]) => {
    withMutation({
      mutationFn: async () => {
      let allSucceeded = true;
      const failedBooks: string[] = [];
  
      for (const batchId of batchIds) {
        const itemsInBatch = (processingBatchItems || []).filter(i => i.batchId === batchId);
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
          } catch (e) { console.error(`Failed to update status for item ${item.id}`, e); }

          if (!moveResult) {
            allSucceeded = false;
            const book = rawBooks?.find(b => b.id === item.bookId);
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
            logAction('Batch Sent to Final QC', `Batch ${batchId} was successfully sent to Final QC.`, {});
          } catch (e) { console.error(`Failed to finalize batch ${batchId}`, e); }
        }
      }
  
      if (failedBooks.length > 0) {
        throw new Error(`Could not move the following books: ${failedBooks.join(', ')}.`);
      }
    }, 
    invalidateKeys: ['PROCESSING_BATCHES', 'PROCESSING_BATCH_ITEMS', 'RAW_BOOKS'],
    successMessage: `${batchIds.length} lote(s) movido(s) para o Controle de Qualidade Final.`});
  };

  const setProvisionalDeliveryStatus = async (deliveryItemId: string, bookId: string, status: 'approved' | 'rejected', reason?: string) => {
    withMutation({
      mutationFn: async () => {
        if (!currentUser) throw new Error("Utilizador não autenticado");
        const response = await fetch(`/api/delivery-batch-items/${deliveryItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status, user_id: currentUser.id })
        });
        if (!response.ok) throw new Error('Falha ao atualizar status do item de entrega.');
        
        if (status === 'rejected') {
          await updateBook(bookId, { rejectionReason: reason });
          logAction('Rejection Marked', `Book "${rawBooks?.find(b => b.id === bookId)?.name}" marked as rejected. Reason: ${reason}`, { bookId });
        } else {
          const book = rawBooks?.find(b => b.id === bookId);
          if (book?.rejectionReason) {
            await updateBook(bookId, { rejectionReason: null });
          }
          logAction('Approval Marked', `Book "${book?.name}" marked as approved by client.`, { bookId });
        }
      },
      invalidateKeys: ['DELIVERY_BATCH_ITEMS', 'RAW_BOOKS'],
      successMessage: `Livro Marcado como ${status}`
    });
  };

  const finalizeDeliveryBatch = async (deliveryId: string, finalDecision: 'approve_remaining' | 'reject_all') => {
    withMutation({
      mutationFn: async () => {
        if (!currentUser) throw new Error("Utilizador não autenticado");
        
        const itemsInBatch = (deliveryBatchItems || []).filter(item => item.deliveryId === deliveryId);

        for (const item of itemsInBatch) {
            const book = rawBooks?.find(b => b.id === item.bookId);
            if (!book || !statuses) continue;
            const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
            if (!currentStatusName) continue;
            
            let newStatusName = (finalDecision === 'reject_all') ? 'Client Rejected' : (item.status === 'rejected' ? 'Client Rejected' : 'Finalized');
            
            if (currentStatusName !== newStatusName) {
                const moveResult = await moveBookFolder(book.name, currentStatusName, newStatusName);
                if (!moveResult) throw new Error(`Failed to move folder for book: ${book.name}`);
            }
        }

        const response = await fetch(`/api/delivery-batches/${deliveryId}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ finalDecision, userId: currentUser.id }),
        });
        if (!response.ok) throw new Error('Falha ao finalizar lote via API.');
        
        logAction('Delivery Batch Finalized', `Batch ${deliveryId} was finalized by ${currentUser.name}. Decision: ${finalDecision}.`, { userId: currentUser.id });
      },
      invalidateKeys: ['DELIVERY_BATCHES', 'DELIVERY_BATCH_ITEMS', 'RAW_BOOKS', 'AUDIT_LOGS'],
      successMessage: "Validação Confirmada"
    });
  };
  
   const distributeValidationSample = async (batchId: string, assignments: { itemId: string, userId: string}[]) => {
     withMutation({
       mutationFn: async () => {
        const response = await fetch('/api/delivery-batches/distribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId, assignments }),
        });
        if (!response.ok) throw new Error('Falha ao distribuir amostra');
        logAction('Validation Distributed', `${assignments.length} items from batch ${batchId} distributed.`, {});
      },
      invalidateKeys: ['DELIVERY_BATCHES', 'DELIVERY_BATCH_ITEMS'],
      successMessage: "Amostra Distribuída"
     });
   };

  const approveBatch = async (deliveryId: string) => {
    withMutation({
      mutationFn: async () => {
        const itemsToApprove = (deliveryBatchItems || []).filter(item => item.deliveryId === deliveryId && item.status === 'pending');
        for (const item of itemsToApprove) {
            await setProvisionalDeliveryStatus(item.id, item.bookId, 'approved');
        }
        await finalizeDeliveryBatch(deliveryId, 'approve_remaining');
      },
      invalidateKeys: ['DELIVERY_BATCHES', 'DELIVERY_BATCH_ITEMS', 'RAW_BOOKS'],
      successMessage: "Lote Aprovado"
    });
  };

  const handleFinalize = (bookId: string) => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book || !book.projectId || !statuses) return;
        const workflow = projectWorkflows?.[book.projectId] || [];
        const nextStageKey = getNextEnabledStage('finalized', workflow) || 'archive';
        const newStatus = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Archived';
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;

        const moveResult = await moveBookFolder(book.name, currentStatusName, newStatus);
        if (moveResult) {
          await updateBookStatus(bookId, newStatus);
          logAction('Book Archived', `Book "${book?.name}" was finalized and moved to ${newStatus}.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Livro Arquivado"
    });
  };
  
  const handleMarkAsCorrected = (bookId: string) => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book || !book.projectId || !statuses) return;
        const workflow = projectWorkflows?.[book.projectId] || [];
        const nextStageKey = getNextEnabledStage('client-rejections', workflow) || 'corrected';
        const newStatus = STAGE_CONFIG[nextStageKey]?.dataStatus || 'Corrected';
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        
        const moveResult = await moveBookFolder(book.name, currentStatusName, newStatus);
        if (moveResult) {
          await updateBookStatus(bookId, newStatus, { rejectionReason: null });
          logAction('Marked as Corrected', `Book "${book.name}" marked as corrected after client rejection.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Livro Corrigido"
    });
  };

  const handleResubmit = (bookId: string, targetStage: string) => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book || !statuses) return;
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        const moveResult = await moveBookFolder(book.name, currentStatusName, targetStage);
        if (moveResult) {
          await updateBookStatus(bookId, targetStage);
          logAction('Book All Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Todos os Livros Reenviados"
    });
  };

    const handleResubmitCopyTifs = (bookId: string, targetStage: string) => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book || !statuses) return;
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        const moveResult = await copyTifsBookFolder(book.name, currentStatusName, targetStage);
        if (moveResult) {
          await updateBookStatus(bookId, targetStage);
          logAction('Book Copy Tifs Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Reenvio de TIFs do Livro"
    });
  };


    const handleResubmitMoveTifs = (bookId: string, targetStage: string) => {
    withMutation({
      mutationFn: async () => {
        const book = rawBooks?.find(b => b.id === bookId);
        if (!book || !statuses) return;
        const currentStatusName = statuses.find(s => s.id === book.statusId)?.name;
        if (!currentStatusName) return;
        const moveResult = await moveTifsBookFolder(book.name, currentStatusName, targetStage);
        if (moveResult) {
          await updateBookStatus(bookId, targetStage);
          logAction('Book Move Tifs Resubmitted', `Book "${book.name}" resubmitted to ${targetStage}.`, { bookId });
        }
      },
      invalidateKeys: ['RAW_BOOKS'],
      successMessage: "Reenvio de TIFs do Livro"
    });
  };


  const handleCreateDeliveryBatch = async (bookIds: string[]) => {
    await withMutation({
      mutationFn: async () => {
        const response = await fetch('/api/delivery-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds, userId: currentUser?.id }),
        });
        if (!response.ok) throw new Error('Falha ao criar lote de entrega');
        
        for (const bookId of bookIds) {
          await handleMoveBookToNextStage(bookId, 'Delivery');
        }
        
        logAction('Delivery Batch Created', `Batch created with ${bookIds.length} books and sent to client.`, {});
      },
      invalidateKeys: ['DELIVERY_BATCHES', 'DELIVERY_BATCH_ITEMS', 'RAW_BOOKS'],
      successMessage: "Lote de Entrega Criado e Enviado"
    });
  };

  const booksAvaiableInStorageLocalIp = React.useCallback(async (currentStageKey: string) => {
    if ((currentStageKey !== 'to-indexing' && currentStageKey !== 'to-checking') || !storages) {
        return [];
    }
    const localIP = await getLocalIP();        
    const accessibleStorageIds = storages.filter(s => s.ip === localIP).map(s => String(s.id));

    if (accessibleStorageIds.length === 0) {
      return [];
    }
    const projectsToScan = selectedProjectId ? (rawProjects || []).filter(p => p.id === selectedProjectId) : accessibleProjectsForUser;
    let availableBooks: EnrichedBook[] = [];

    for (const project of projectsToScan) {
      const projectWorkflow = projectWorkflows?.[project.id] || [];
      const currentStageIndexInProjectWorkflow = projectWorkflow.indexOf(currentStageKey);
      if (currentStageIndexInProjectWorkflow > 0) {
        const previousStageKey = projectWorkflow[currentStageIndexInProjectWorkflow - 1];
        const previousStageStatus = STAGE_CONFIG[previousStageKey]?.dataStatus;
        if (!previousStageStatus) continue;
        const workflowConfig = STAGE_CONFIG[currentStageKey];
        const booksAvaiable = enrichedBooks.filter(b => 
          b.projectId === project.id &&
          b.status === previousStageStatus &&
          !b[workflowConfig.assigneeRole! + 'UserId' as keyof EnrichedBook] &&
          (b.storageId && accessibleStorageIds.includes(String(b.storageId)))
        );
        if (booksAvaiable.length > 0) {
          availableBooks = [...availableBooks, ...booksAvaiable];
        }
      }
    }
    return availableBooks;
  }, [enrichedBooks, selectedProjectId, accessibleProjectsForUser, projectWorkflows, storages, toast]);


    const handlePullNextTask = React.useCallback(async (currentStageKey: string, userIdToAssign?: string) => {
      await withMutation({
          mutationFn: async () => {
          const assigneeId = userIdToAssign || currentUser?.id;
          if (!assigneeId) throw new Error("Nenhum utilizador especificado para atribuição.");
          const user = users?.find(u => u.id === assigneeId);
          if (!user) throw new Error("Utilizador atribuído não encontrado.");
          
          const workflowConfig = STAGE_CONFIG[currentStageKey];
          if (!workflowConfig || !workflowConfig.assigneeRole) throw new Error("Fase inválida para puxar tarefas.");
          
          const availableBooks = await booksAvaiableInStorageLocalIp(currentStageKey);

          if(!availableBooks || availableBooks.length === 0) {
            return "Sem Tarefas Disponíveis";
          }

          const bookToAssign = availableBooks[0];

          handleAssignUser(bookToAssign.id, assigneeId, workflowConfig.assigneeRole);
        }, 
        invalidateKeys: ['RAW_BOOKS'],
        successMessage: "Tarefa Puxada com Sucesso"
      });
  }, [currentUser, users, handleAssignUser, booksAvaiableInStorageLocalIp, withMutation]);

  const scannerUsers = React.useMemo(() => (users || []).filter(user => user.role === 'Scanning'), [users]);
  const indexerUsers = React.useMemo(() => (users || []).filter(user => user.role === 'Indexing'), [users]);
  const qcUsers = React.useMemo(() => (users || []).filter(user => user.role === 'QC Specialist'), [users]);

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
    loadingPage, isMutating, isPageLoading, processingBookIds, setIsMutating,
    currentUser, login, logout, changePassword,
    navigationHistory, addNavigationHistoryItem,
    clients: clients || [], 
    users: users || [], 
    scannerUsers, indexerUsers, qcUsers,
    projects: projectsForContext, 
    books: booksForContext, 
    documents: documentsForContext, 
    auditLogs: enrichedAuditLogs,
    bookObservations: bookObservations || [],
    processingBatches: processingBatches || [], 
    processingBatchItems: processingBatchItems || [], 
    processingLogs: processingLogs || [],
    deliveryBatches: deliveryBatches || [], 
    deliveryBatchItems: deliveryBatchItems || [],
    roles: roles || [],
    permissions: permissions || {},
    projectWorkflows: projectWorkflows || {},
    projectStorages: projectStorages || [],
    rejectionTags: rejectionTags || [],
    storages: storages || [],
    scanners: scanners || [],
    statuses: statuses || [],
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
    booksAvaiableInStorageLocalIp,
    logAction,
    moveBookFolder,
    moveTifsBookFolder,
    copyTifsBookFolder,
    updateBookStatus,
    loadInitialData,
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
