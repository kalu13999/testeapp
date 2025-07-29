

export interface Storage {
    id: string;
    nome: string;
    ip: string;
    root_path: string;
    thumbs_path: string;
    percentual_minimo_diario: number;
    minimo_diario_fixo: number;
    peso: number;
    status: 'ativo' | 'inativo';
}

export interface LogTransferencia {
    id: number;
    nome_pasta: string;
    bookId: string;
    total_tifs: number;
    storage_id: string;
    scanner_id: string;
    status: 'sucesso' | 'erro';
    data_inicio: string;
    data_fim: string;
    detalhes?: string;
}


// Define types for our data structures
export interface Client {
    id: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    website: string;
    since: string;
    info?: string;
}

export interface RejectionTag {
    id: string;
    clientId: string;
    label: string;
    description: string;
}

export interface DocumentStatus {
    id: string;
    name: string;
    stage: string;
    folderName: string | null;
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface Document {
    id: string;
    clientId: string;
    type: string;
    lastUpdated: string;
    tags: string[];
    name: string;
    folderId?: string | null;
    projectId?: string | null;
    bookId?: string | null;
    flag?: 'error' | 'warning' | 'info' | null;
    flagComment?: string;
    imageUrl?: string;
}

export interface AuditLog {
    id: string;
    action: string;
    userId: string;
    date: string;
    details: string;
    documentId?: string;
    bookId?: string;
}

export interface User {
    id: string;
    name: string;
    username?: string;
    password?: string;
    email: string | null;
    avatar: string | null;
    role: string;
    phone?: string;
    jobTitle?: string;
    department?: string;
    lastLogin?: string;
    info?: string;
    clientId?: string;
    projectIds?: string[];
    status: 'active' | 'disabled';
    defaultProjectId?: string;
}

export interface RawBook {
    id: string;
    name: string;
    statusId: string;
    expectedDocuments: number;
    projectId: string;
    author?: string;
    isbn?: string;
    publicationYear?: number;
    priority?: 'Low' | 'Medium' | 'High';
    info?: string;
    scannerUserId?: string;
    scanStartTime?: string;
    scanEndTime?: string;
    indexerUserId?: string;
    indexingStartTime?: string;
    indexingEndTime?: string;
    qcUserId?: string;
    qcStartTime?: string;
    qcEndTime?: string;
    rejectionReason?: string | null;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    description: string;
    startDate: string;
    endDate: string;
    budget: number;
    status: "Planning" | "In Progress" | "Complete" | "On Hold";
    info?: string;
}

export interface ProcessingBatch {
  id: string;
  startTime: string;
  endTime: string | null;
  status: 'In Progress' | 'Complete' | 'Failed';
  progress: number;
  timestampStr: string;
  info: string | null;
  obs: string | null;
}

export interface ProcessingBatchItem {
  id: string;
  batchId: string;
  bookId: string;
  itemStartTime: string | null;
  itemEndTime: string | null;
  processedPages: Record<string, number> | null;
  status: 'Pending' | 'In Progress' | 'Complete' | 'Failed';
  info: string | null;
  obs: string | null;
}

export interface ProcessingLog {
  id: string;
  batchId: string;
  message: string;
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN';
  info: string | null;
  obs: string | null;
}


export type Permissions = {
  [role: string]: string[];
}

export type ProjectWorkflows = {
  [projectId: string]: string[];
}


// Enriched types for client-side use
export interface EnrichedProject extends Project {
    clientName: string;
    documentCount: number;
    totalExpected: number;
    progress: number;
    books: EnrichedBook[];
}

// status is added during enrichment
export interface EnrichedBook extends RawBook {
    status: string; 
    projectId: string;
    clientId: string;
    projectName: string;
    clientName: string;
    documentCount: number;
    progress: number;
    storageName?: string;
}


// Helper to fetch data from the API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  let baseUrl = API_BASE_URL;

  if (isServer && !baseUrl) {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      baseUrl = `https://${vercelUrl}`;
    } else {
      // Default to localhost for development if not on Vercel
      baseUrl = `http://localhost:${process.env.PORT || 9002}`;
    }
  }
  
  const url = `${baseUrl}/api${endpoint}`;
  try {
    const response = await fetch(url, { ...options, cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error for ${endpoint}: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Network or fetch error for ${endpoint}:`, error);
    throw error;
  }
}

// Data fetching functions
export const getClients = () => fetchData<Client[]>('/clients');
export const getClientById = (id: string) => fetchData<Client>(`/clients/${id}`);
export const getUsers = () => fetchData<User[]>('/users');
export const getUserById = (id: string) => fetchData<User>(`/users/${id}`);
export const getRawProjects = () => fetchData<Project[]>('/projects');
export const getProjectById = (id: string) => fetchData<Project>(`/projects/${id}`);
export const getRawBooks = () => fetchData<RawBook[]>('/books');
export const getBookById = (id: string) => fetchData<RawBook>(`/books/${id}`);
export const getRawDocuments = () => fetchData<Document[]>('/documents');
export const getDocumentById = (id: string) => fetchData<Document>(`/documents/${id}`);
export const getAuditLogs = () => fetchData<AuditLog[]>('/audit-logs');
export const getPermissions = () => fetchData<Permissions>('/permissions');
export const getRoles = () => fetchData<string[]>('/roles');
export const getProjectWorkflows = () => fetchData<ProjectWorkflows>('/project-workflows');
export const getRejectionTags = () => fetchData<RejectionTag[]>('/rejection-tags');
export const getDocumentStatuses = () => fetchData<DocumentStatus[]>('/document-statuses');
export const getFolders = () => fetchData<Folder[]>('/folders');
export const getStorages = () => fetchData<Storage[]>('/storages');
export const getTransferLogs = () => fetchData<LogTransferencia[]>('/log-transferencias');


// New functions for processing batches
export const getProcessingBatches = () => fetchData<ProcessingBatch[]>('/processing-batches');
export const getProcessingBatchItems = () => fetchData<ProcessingBatchItem[]>('/processing-batch-items');
export const getProcessingLogs = () => fetchData<ProcessingLog[]>('/processing-logs');


// Enriched data fetching functions
export async function getEnrichedProjects(): Promise<EnrichedProject[]> {
    const [projects, clients, books, documents, statuses, transferLogs, storages] = await Promise.all([
      getRawProjects(),
      getClients(),
      getRawBooks(),
      getRawDocuments(),
      getDocumentStatuses(),
      getTransferLogs(),
      getStorages(),
    ]);

    const storageMap = new Map(storages.map(s => [s.id, s.nome]));
    const bookStorageMap = new Map<string, string>();

    transferLogs.forEach(log => {
      if (log.bookId && log.status === 'sucesso' && storageMap.has(log.storage_id)) {
          // A lógica pode precisar de ser mais robusta, por exemplo, pegar o mais recente.
          // Por agora, o último registo de sucesso para um livro define o seu storage.
          bookStorageMap.set(log.bookId, storageMap.get(log.storage_id)!);
      }
    });
  
    return projects.map(project => {
      const client = clients.find(c => c.id === project.clientId);
      
      const projectBooks = books.filter(b => b.projectId === project.id).map(book => {
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
          storageName: bookStorageMap.get(book.id),
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
}
  
export async function getEnrichedProjectById(id: string): Promise<EnrichedProject | null> {
    const projects = await getEnrichedProjects();
    return projects.find(p => p.id === id) || null;
}

export async function getEnrichedBookById(id: string): Promise<EnrichedBook | null> {
    const projects = await getEnrichedProjects();
    for (const project of projects) {
        const book = project.books.find(b => b.id === id);
        if (book) return book;
    }
    return null;
}

export async function getPagesByBookId(bookId: string): Promise<Document[]> {
    const documents = await getRawDocuments();
    return documents.filter(d => d.bookId === bookId);
}
