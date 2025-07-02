
import fs from 'fs/promises';
import path from 'path';

// Define types for our data structures
export interface Client {
    id: string;
    name: string;
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
}

interface AuditLog {
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
    email: string | null;
    avatar: string | null;
    role: string;
}

export interface Book {
    id: string;
    name: string;
    status: string;
    expectedDocuments: number;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    books: Book[];
}

export interface BookWithProject extends Book {
    projectId: string;
    clientId: string;
    projectName: string;
    clientName: string;
    documentCount: number;
    progress: number;
}


// Helper to read and parse JSON files
async function readJsonFile<T>(filename: string): Promise<T> {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

// Data fetching functions
export async function getClients(): Promise<Client[]> {
    return readJsonFile<Client[]>('clients.json');
}

export async function getFolders(): Promise<Folder[]> {
    return readJsonFile<Folder[]>('folders.json');
}

export async function getDocumentStatuses(): Promise<DocumentStatus[]> {
    return readJsonFile<DocumentStatus[]>('document_statuses.json');
}

export async function getRawDocuments(): Promise<Document[]> {
    return readJsonFile<Document[]>('documents.json');
}

export async function getUsers(): Promise<User[]> {
    return readJsonFile<User[]>('users.json');
}

export async function getUserById(id: string): Promise<User | undefined> {
    const users = await getUsers();
    return users.find(user => user.id === id);
}

export async function getAuditLogs(): Promise<AuditLog[]> {
    return readJsonFile<AuditLog[]>('audit_logs.json');
}

export async function getRawProjects(): Promise<Project[]> {
    return readJsonFile<Project[]>('projects.json');
}

export async function getProjects() {
    const [projects, clients, documents] = await Promise.all([
        getRawProjects(),
        getClients(),
        getRawDocuments()
    ]);

    return projects.map(proj => {
        const client = clients.find(c => c.id === proj.clientId);
        
        const projectDocuments = documents.filter(d => d.projectId === proj.id);
        const totalExpected = proj.books.reduce((sum, book) => sum + book.expectedDocuments, 0);
        const progress = totalExpected > 0 ? (projectDocuments.length / totalExpected) * 100 : 0;
        
        // Simplified status logic: if all books are complete, project is complete. Otherwise, it's in progress.
        const isComplete = proj.books.every(b => b.status === "Complete");

        return {
            ...proj,
            clientName: client?.name || 'Unknown Client',
            documentCount: projectDocuments.length,
            totalExpected,
            progress: Math.min(100, progress), // Cap at 100%
            status: isComplete ? "Complete" : "In Progress",
        };
    });
}

export async function getProjectById(id: string) {
    const [project, clients, documents] = await Promise.all([
        getRawProjects().then(projects => projects.find(p => p.id === id)),
        getClients(),
        getRawDocuments()
    ]);

    if (!project) {
        return null;
    }

    const client = clients.find(c => c.id === project.clientId);

    const projectDocuments = documents.filter(d => d.projectId === project.id);
    const totalExpected = project.books.reduce((sum, book) => sum + book.expectedDocuments, 0);
    const overallProgress = totalExpected > 0 ? (projectDocuments.length / totalExpected) * 100 : 0;

    const booksWithStats = project.books.map(book => {
        const bookDocuments = documents.filter(d => d.bookId === book.id);
        const bookProgress = book.expectedDocuments > 0 ? (bookDocuments.length / book.expectedDocuments) * 100 : 0;
        return {
            ...book,
            documentCount: bookDocuments.length,
            progress: Math.min(100, bookProgress),
        };
    });

    return {
        ...project,
        clientName: client?.name || 'Unknown Client',
        documentCount: projectDocuments.length,
        totalExpected,
        progress: Math.min(100, overallProgress),
        books: booksWithStats,
    };
}


export async function getDocuments() {
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
        };
    });
}

export async function getDocumentById(id: string) {
    const documents = await getDocuments();
    return documents.find(doc => doc.id === id);
}

export async function getAuditLogsByDocumentId(documentId: string) {
    const [logs, users] = await Promise.all([
        getAuditLogs(),
        getUsers()
    ]);

    return logs
        .filter(log => log.documentId === documentId)
        .map(log => {
            const user = users.find(u => u.id === log.userId);
            return {
                ...log,
                user: user?.name || 'Unknown User',
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getDashboardData() {
    const documents = await getDocuments();
    
    const pendingCount = documents.filter(d => ['Quality Control', 'Processing'].includes(d.status)).length;
    const slaWarningsCount = 32; // This was static, keeping it for now
    const processedTodayCount = documents.filter(d => d.lastUpdated === new Date().toISOString().slice(0, 10)).length;
    const totalCount = documents.length;

    const kpiData = [
        { title: "Pending Documents", value: pendingCount.toLocaleString(), description: "Waiting for processing" },
        { title: "SLA Warnings", value: slaWarningsCount.toLocaleString(), description: "Approaching deadline" },
        { title: "Processed Today", value: processedTodayCount.toLocaleString(), description: "Successfully completed" },
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
        
    const chartData = [
        { name: "Jan", approved: 400, rejected: 240 },
        { name: "Feb", approved: 300, rejected: 139 },
        { name: "Mar", approved: 500, rejected: 800 },
        { name: "Apr", approved: 278, rejected: 390 },
        { name: "May", approved: 189, rejected: 480 },
        { name: "Jun", approved: 239, rejected: 380 },
    ];

    return { kpiData, chartData, recentActivities };
}

export type Breadcrumb = {
    id: string | null;
    name: string;
}

async function getBreadcrumbs(folderId: string | null, allFolders: Folder[]): Promise<Breadcrumb[]> {
    const breadcrumbs: Breadcrumb[] = [{ id: null, name: 'Storage' }];
    if (!folderId) {
        return breadcrumbs;
    }

    let currentFolder = allFolders.find(f => f.id === folderId);
    const path: Breadcrumb[] = [];

    while (currentFolder) {
        path.unshift({ id: currentFolder.id, name: currentFolder.name });
        if (currentFolder.parentId) {
            currentFolder = allFolders.find(f => f.id === currentFolder.parentId);
        } else {
            currentFolder = undefined;
        }
    }
    
    return breadcrumbs.concat(path);
}

export async function getFolderContents(folderId: string | null) {
    const [documents, clients, statuses, allFolders] = await Promise.all([
        getRawDocuments(),
        getClients(),
        getDocumentStatuses(),
        getFolders()
    ]);
    
    const postScanStatusIds = statuses
      .filter(s => !['Request Received', 'Received', 'Scanned', 'Pending'].includes(s.name))
      .map(s => s.id)

    const documentsInFolder = documents
        .filter(doc => (doc.folderId || null) === (folderId || null) && postScanStatusIds.includes(doc.statusId))
        .map(doc => {
            const client = clients.find(c => c.id === doc.clientId);
            const status = statuses.find(s => s.id === doc.statusId);
            return {
                ...doc,
                client: client?.name || 'Unknown Client',
                status: status?.name || 'Unknown Status',
            };
        });

    const subFolders = allFolders.filter(folder => folder.parentId === folderId);

    const breadcrumbs = await getBreadcrumbs(folderId, allFolders);

    return {
        documents: documentsInFolder,
        folders: subFolders,
        breadcrumbs: breadcrumbs
    };
}

export async function getBooks(): Promise<BookWithProject[]> {
    const [projects, documents] = await Promise.all([
        getProjects(),
        getRawDocuments()
    ]);
    
    const books: BookWithProject[] = [];

    for (const project of projects) {
        for (const book of project.books) {
            const bookDocuments = documents.filter(d => d.bookId === book.id);
            const bookProgress = book.expectedDocuments > 0 ? (bookDocuments.length / book.expectedDocuments) * 100 : 0;
            books.push({
                ...book,
                projectId: project.id,
                clientId: project.clientId,
                projectName: project.name,
                clientName: project.clientName,
                documentCount: bookDocuments.length,
                progress: Math.min(100, bookProgress),
            });
        }
    }
    return books;
}

export async function getBookById(id: string): Promise<BookWithProject | undefined> {
    const books = await getBooks();
    return books.find(b => b.id === id);
}

export async function getPagesByBookId(bookId: string) {
    const allDocs = await getDocuments();
    return allDocs.filter(doc => doc.bookId === bookId);
}
