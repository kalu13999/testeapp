
import fs from 'fs/promises';
import path from 'path';

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

export interface DocumentStatus {
    id: string;
    name: string;
    stage: string;
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface Document {
    id: string;
    clientId: string;
    statusId: string;
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
    documentId: string;
    action: string;
    userId: string;
    date: string;
    details: string;
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
}

export interface RawBook {
    id: string;
    name: string;
    status: string;
    expectedDocuments: number;
    projectId: string;
    isbn?: string;
    author?: string;
    publicationYear?: number;
    priority?: 'Low' | 'Medium' | 'High';
    info?: string;
    scannerUserId?: string;
    scanStartTime?: string;
    scanEndTime?: string;
    rejectionReason?: string;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    description: string;
    startDate: string;
    endDate: string;
    budget: number;
    status: string; // "Planning", "In Progress", "Complete", "On Hold"
    info?: string;
}

export interface ProcessingLog {
    id: string;
    bookId: string;
    status: 'In Progress' | 'Complete' | 'Failed';
    progress: number;
    log: string;
    startTime: string;
    lastUpdate: string;
}

export type Permissions = {
  [role: string]: string[];
}

// Enriched types for client-side use
export interface EnrichedProject extends Project {
    clientName: string;
    documentCount: number;
    totalExpected: number;
    progress: number;
    books: EnrichedBook[];
}

export interface EnrichedBook extends RawBook {
    projectId: string;
    clientId: string;
    projectName: string;
    clientName: string;
    documentCount: number;
    progress: number;
    rejectionReason?: string | null;
}


// Helper to read and parse JSON files
async function readJsonFile<T>(filename: string): Promise<T> {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

// Data fetching functions
export const getClients = () => readJsonFile<Client[]>('clients.json');
export const getFolders = () => readJsonFile<Folder[]>('folders.json');
export const getDocumentStatuses = () => readJsonFile<DocumentStatus[]>('document_statuses.json');
export const getRawDocuments = () => readJsonFile<Document[]>('documents.json');
export const getUsers = () => readJsonFile<User[]>('users.json');
export const getAuditLogs = () => readJsonFile<AuditLog[]>('audit_logs.json');
export const getRawProjects = () => readJsonFile<Project[]>('projects.json');
export const getRawBooks = () => readJsonFile<RawBook[]>('books.json');
export const getProcessingLogs = () => readJsonFile<ProcessingLog[]>('processing_logs.json');
export const getPermissions = () => readJsonFile<Permissions>('permissions.json');
export const getRoles = () => readJsonFile<string[]>('roles.json');


export async function getUserById(id: string): Promise<User | undefined> {
    const users = await getUsers();
    return users.find(user => user.id === id);
}

export async function getEnrichedAuditLogs() {
    const [logs, users] = await Promise.all([
        getAuditLogs(),
        getUsers()
    ]);

    return logs
        .map(log => {
            const user = users.find(u => u.id === log.userId);
            return {
                ...log,
                user: user?.name || 'Unknown User',
            };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getEnrichedProjects(): Promise<EnrichedProject[]> {
    const [projects, clients, books, documents] = await Promise.all([
        getRawProjects(),
        getClients(),
        getEnrichedBooks(),
        getEnrichedDocuments()
    ]);

    return projects.map(proj => {
        const client = clients.find(c => c.id === proj.clientId);
        const projectBooks = books.filter(b => b.projectId === proj.id);
        const projectDocuments = documents.filter(d => d.projectId === proj.id);
        
        const totalExpected = projectBooks.reduce((sum, book) => sum + book.expectedDocuments, 0);
        const progress = totalExpected > 0 ? (projectDocuments.length / totalExpected) * 100 : 0;
        
        return {
            ...proj,
            clientName: client?.name || 'Unknown Client',
            documentCount: projectDocuments.length,
            totalExpected,
            progress: Math.min(100, progress),
            books: projectBooks
        };
    });
}

export async function getEnrichedProjectById(id: string): Promise<EnrichedProject | null> {
    const projects = await getEnrichedProjects();
    return projects.find(p => p.id === id) || null;
}


export async function getEnrichedDocuments() {
    const [documents, clients, statuses] = await Promise.all([
        getRawDocuments(),
        getClients(),
        getDocumentStatuses()
    ]);

    return documents.map(doc => {
        const client = clients.find(c => c.id === doc.clientId);
        const status = statuses.find(s => s.id === doc.statusId);
        return {
            ...doc,
            client: client?.name || 'Unknown Client',
            status: status?.name || 'Unknown Status',
            flag: doc.flag || null,
        };
    });
}

export async function getEnrichedBooks(): Promise<EnrichedBook[]> {
    const [books, projects, clients, documents] = await Promise.all([
        getRawBooks(),
        getRawProjects(),
        getClients(),
        getRawDocuments()
    ]);
    
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
}

export async function getEnrichedBookById(id: string): Promise<EnrichedBook | undefined> {
    const books = await getEnrichedBooks();
    return books.find(b => b.id === id);
}

export async function getPagesByBookId(bookId: string) {
    const allDocs = await getEnrichedDocuments();
    return allDocs.filter(doc => doc.bookId === bookId);
}

export async function getDashboardData() {
    const [documents, projects] = await Promise.all([
        getEnrichedDocuments(),
        getEnrichedProjects()
    ]);
    
    const pendingCount = documents.filter(d => ['Quality Control', 'Processing', 'Indexing'].includes(d.status)).length;
    
    // Example: count projects with progress < 50% as having SLA warnings
    const slaWarningsCount = projects.filter(p => p.progress < 50 && p.status === 'In Progress').length;
    
    const processedTodayCount = documents.filter(d => d.lastUpdated === new Date().toISOString().slice(0, 10)).length;
    const totalCount = documents.length;

    const kpiData = [
        { title: "Pending Documents", value: pendingCount.toLocaleString(), description: "Awaiting processing" },
        { title: "SLA Warnings", value: slaWarningsCount.toLocaleString(), description: "Projects with low progress" },
        { title: "Processed Today", value: processedTodayCount.toLocaleString(), description: "Docs updated today" },
        { title: "Total in Workflow", value: totalCount.toLocaleString(), description: "Across all stages" },
    ];
    
    const recentActivities = documents
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        .slice(0, 5)
        .map(doc => ({
            id: doc.id,
            client: doc.client,
            status: doc.status
        }));
        
    // Generate more dynamic chart data
    const monthlyStats: {[key: string]: { approved: number, rejected: number }} = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    documents.forEach(doc => {
        const date = new Date(doc.lastUpdated);
        const monthKey = monthNames[date.getMonth()];
        if (!monthKey) return;

        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { approved: 0, rejected: 0 };
        }

        if (doc.status === 'Finalized' || doc.status === 'Archived') {
            monthlyStats[monthKey].approved += 1;
        } else if (doc.status === 'Client Rejected') {
            monthlyStats[monthKey].rejected += 1;
        }
    });

    const chartData = monthNames.map(name => ({
        name,
        approved: monthlyStats[name]?.approved || 0,
        rejected: monthlyStats[name]?.rejected || 0,
    })).slice(0, 6); // Show first 6 months for example


    return { kpiData, chartData, recentActivities };
}
