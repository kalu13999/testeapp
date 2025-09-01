
"use client"

import * as React from 'react';
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from '@/context/workflow-context';
import { BookCheck, Clock, History, User, Files, Settings, ChevronsUpDown, ArrowDown, ArrowUp, Download } from 'lucide-react';
import { type EnrichedAuditLog } from '@/context/workflow-context';
import type { EnrichedBook } from '@/lib/data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 15;

const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

const completionActions = [
    'Scanning Finished', 'Initial QC Complete', 'Processing Completed', 
    'Client Approval', 'Book Archived', 'Assigned for QC' // Indexing completion
];

export default function ProfileClient() {
    const { currentUser, books, auditLogs, permissions, users } = useAppContext();
    const { toast } = useToast();

    // State for Queue Table
    const [queueColumnFilters, setQueueColumnFilters] = React.useState<{ [key: string]: string }>({});
    const [queueCurrentPage, setQueueCurrentPage] = React.useState(1);
    const [queueSorting, setQueueSorting] = React.useState<{ id: string; desc: boolean }[]>([ { id: 'status', desc: false } ]);

    // State for History Table
    const [historyColumnFilters, setHistoryColumnFilters] = React.useState<{ [key: string]: string }>({});
    const [historyCurrentPage, setHistoryCurrentPage] = React.useState(1);
    const [historySorting, setHistorySorting] = React.useState<{ id: string; desc: boolean }[]>([ { id: 'date', desc: true } ]);

    const canViewAllData = React.useMemo(() => {
        if (!currentUser) return false;
        const userPermissions = permissions[currentUser.role] || [];
        return userPermissions.includes('*') || userPermissions.includes('/workflow/view-all');
    }, [currentUser, permissions]);

    const getAssignedDateString = (book: EnrichedBook): string => {
        let date: string | null | undefined;

        switch (book.status) {
            case 'Scanning Started': date = book.scanStartTime; break;
            case 'To Indexing': date = book.scanEndTime; break;
            case 'Indexing Started': date = book.indexingStartTime; break;
            case 'To Checking': date = book.indexingEndTime; break;
            case 'Checking Started': date = book.qcStartTime; break;
        }
        return date ? new Date(date).toLocaleDateString() : 'Pending Start';
    };


    const userStats = React.useMemo(() => {
        if (!currentUser) return { tasksInQueue: 0, tasksToday: 0, queue: [], history: [] };

        const assignableStatuses = ['To Scan', 'Scanning Started', 'To Indexing', 'Indexing Started', 'To Checking', 'Checking Started'];
        const today = new Date().toISOString().slice(0, 10);

        if (canViewAllData) {
            const allQueuedBooks = books.filter(book => assignableStatuses.includes(book.status));
            const allHistory = auditLogs;
            const allTasksToday = auditLogs.filter(log => 
                log.date.startsWith(today) && 
                completionActions.includes(log.action)
            ).length;

            const allQueuedBooksWithAssignee = allQueuedBooks.map(book => {
                let assigneeId: string | undefined;
                let assigneeName = 'Unassigned';
                if (['To Scan', 'Scanning Started'].includes(book.status)) assigneeId = book.scannerUserId;
                else if (['To Indexing', 'Indexing Started'].includes(book.status)) assigneeId = book.indexerUserId;
                else if (['To Checking', 'Checking Started'].includes(book.status)) assigneeId = book.qcUserId;
                
                if (assigneeId) {
                    assigneeName = users.find(u => u.id === assigneeId)?.name || 'Unknown';
                }
                return { ...book, assigneeName };
            });

            return {
                tasksInQueue: allQueuedBooks.length,
                tasksToday: allTasksToday,
                queue: allQueuedBooksWithAssignee,
                history: allHistory,
            };
        } else {
            const myQueue = books.filter(book => {
                if (!currentUser) return false;
                const isScannerTask = book.scannerUserId === currentUser.id && ['To Scan', 'Scanning Started'].includes(book.status);
                const isIndexerTask = book.indexerUserId === currentUser.id && ['To Indexing', 'Indexing Started'].includes(book.status);
                const isQcTask = book.qcUserId === currentUser.id && ['To Checking', 'Checking Started'].includes(book.status);
                return isScannerTask || isIndexerTask || isQcTask;
            });
            const myHistory = auditLogs.filter(log => log.userId === currentUser.id).slice(0, 15);
            const tasksToday = auditLogs.filter(log => log.userId === currentUser.id && log.date.startsWith(today) && completionActions.includes(log.action)).length;
            return { tasksInQueue: myQueue.length, tasksToday, queue: myQueue, history: myHistory };
        }
    }, [currentUser, books, auditLogs, permissions, canViewAllData, users]);

    // --- GENERIC HELPERS & EXPORT LOGIC ---
    const downloadFile = (content: string, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    const exportJSON = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const jsonString = JSON.stringify(data, null, 2);
        downloadFile(jsonString, filename, 'application/json');
        toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato JSON.` });
    }
    const exportCSV = (data: any[], headers: string[], filename: string) => {
        if (data.length === 0) return;
        const csvContent = [
            headers.join(','),
            ...data.map(item => headers.map(header => {
                let value = item[header as keyof typeof item] ?? '';
                if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
                return value;
            }).join(','))
        ].join('\n');
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
        toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato CSV.` });
    }
    const exportXLSX = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, filename);
        toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato XLSX.` });
    }

    // --- QUEUE TABLE LOGIC ---
    const sortedAndFilteredQueue = React.useMemo(() => {
        let filtered = userStats.queue as (EnrichedBook & { assigneeName?: string })[];
        Object.entries(queueColumnFilters).forEach(([columnId, value]) => {
            if (value) {
                filtered = filtered.filter(item => String(item[columnId as keyof typeof item]).toLowerCase().includes(value.toLowerCase()));
            }
        });
        if (queueSorting.length > 0) {
            filtered.sort((a, b) => {
                for (const s of queueSorting) {
                    const valA = a[s.id as keyof typeof a];
                    const valB = b[s.id as keyof typeof b];
                    const result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    if (result !== 0) return s.desc ? -result : result;
                }
                return 0;
            });
        }
        return filtered;
    }, [userStats.queue, queueColumnFilters, queueSorting]);
    const paginatedQueue = sortedAndFilteredQueue.slice((queueCurrentPage - 1) * ITEMS_PER_PAGE, queueCurrentPage * ITEMS_PER_PAGE);

    // --- HISTORY TABLE LOGIC ---
    const sortedAndFilteredHistory = React.useMemo(() => {
        let filtered = userStats.history as EnrichedAuditLog[];
        Object.entries(historyColumnFilters).forEach(([columnId, value]) => {
            if (value) {
                filtered = filtered.filter(item => String(item[columnId as keyof typeof item]).toLowerCase().includes(value.toLowerCase()));
            }
        });
        if (historySorting.length > 0) {
            filtered.sort((a, b) => {
                for (const s of historySorting) {
                    const valA = a[s.id as keyof typeof a];
                    const valB = b[s.id as keyof typeof b];
                    const result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    if (result !== 0) return s.desc ? -result : result;
                }
                return 0;
            });
        }
        return filtered;
    }, [userStats.history, historyColumnFilters, historySorting]);
    const paginatedHistory = sortedAndFilteredHistory.slice((historyCurrentPage - 1) * ITEMS_PER_PAGE, historyCurrentPage * ITEMS_PER_PAGE);

    const handleSort = (columnId: string, sorting: any[], setSorting: Function) => {
        setSorting((currentSorting: any[]) => {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) return [];
                return [{ id: columnId, desc: true }];
            }
            return [{ id: columnId, desc: false }];
        });
    };
    const getSortIndicator = (columnId: string, sorting: any[]) => {
        const sort = sorting.find(s => s.id === columnId);
        if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
        return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
    };

    const PaginationNav = ({ totalPages, currentPage, setCurrentPage }: { totalPages: number, currentPage: number, setCurrentPage: Function }) => {
        if (totalPages <= 1) return null;
        return (
            <Pagination><PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p:number) => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>{currentPage}</PaginationLink></PaginationItem>
                <PaginationItem><PaginationEllipsis /></PaginationItem>
                <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p:number) => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
            </PaginationContent></Pagination>
        );
    }
    
    if (!currentUser) return <div className="flex items-center justify-center h-full"><p>Loading user profile...</p></div>;
    const userPermissions = permissions[currentUser.role] || [];
    const hasSettingsPermission = userPermissions.includes('*') || userPermissions.includes('/settings');
    
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20"><AvatarImage src={currentUser.avatar || ''} alt={currentUser.name} data-ai-hint="person avatar"/><AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback></Avatar>
                            <div><CardTitle className="text-2xl font-bold">{currentUser.name}</CardTitle><CardDescription>{currentUser.jobTitle}</CardDescription><Badge variant="secondary" className="mt-2">{currentUser.role}</Badge></div>
                        </div>
                        {hasSettingsPermission && (<Button asChild variant="outline" size="icon"><Link href="/settings" aria-label="Go to settings"><Settings className="h-4 w-4" /></Link></Button>)}
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground"><p>{currentUser.department} Departamento</p><p>{currentUser.email}</p></CardContent>
                </Card>
                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    {canViewAllData ? 'Total de Tarefas Pendentes' : 'Minhas Tarefas Pendentes'}
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{userStats.tasksInQueue}</div>
                    <p className="text-xs text-muted-foreground">
                    {canViewAllData ? 'Em todos os utilizadores' : 'Livros atualmente atribuídos a si'}
                    </p>
                </CardContent>
                </Card>

                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    {canViewAllData ? 'Total de Tarefas Concluídas Hoje' : 'Tarefas Concluídas Hoje'}
                    </CardTitle>
                    <BookCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{userStats.tasksToday}</div>
                    <p className="text-xs text-muted-foreground">
                    {canViewAllData ? 'Em todos os utilizadores' : 'Número de livros processados hoje'}
                    </p>
                </CardContent>
                </Card>
                </div>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-headline flex items-center gap-2"><Files className="h-5 w-5"/>{canViewAllData ? 'Todas as Tarefas Pendentes do Sistema' : 'As Minhas Tarefas Pendentes'}</CardTitle>
                            <CardDescription>
                            {canViewAllData 
                                ? 'Todos os livros atualmente atribuídos a qualquer utilizador para ação.' 
                                : 'Todos os livros e tarefas atualmente atribuídos a si para ação.'}
                            </CardDescription>
                          </div>
                           {canViewAllData && (<DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-9 gap-1"><Download className="h-3.5 w-3.5" /><span>Exportar</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Exportar Todos ({sortedAndFilteredQueue.length})</DropdownMenuLabel><DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredQueue, 'queue_export.xlsx')}>Exportar como XLSX</DropdownMenuItem><DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredQueue, 'queue_export.json')}>Exportar como JSON</DropdownMenuItem><DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredQueue, ['name', 'projectName', 'status', 'assigneeName'], 'queue_export.csv')}>Exportar como CSV</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                {canViewAllData ? (
                                    <>
                                        <TableRow>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name', queueSorting, setQueueSorting)}>Nome do Livro {getSortIndicator('name', queueSorting)}</div></TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName', queueSorting, setQueueSorting)}>Projeto {getSortIndicator('projectName', queueSorting)}</div></TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status', queueSorting, setQueueSorting)}>Estado {getSortIndicator('status', queueSorting)}</div></TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('assigneeName', queueSorting, setQueueSorting)}>Atribuído a {getSortIndicator('assigneeName', queueSorting)}</div></TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead><Input placeholder="Filtrar nome..." value={queueColumnFilters['name'] || ''} onChange={(e) => setQueueColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
                                            <TableHead><Input placeholder="Filtrar projeto..." value={queueColumnFilters['projectName'] || ''} onChange={(e) => setQueueColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                                            <TableHead><Input placeholder="Filtrar estado..." value={queueColumnFilters['status'] || ''} onChange={(e) => setQueueColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                                            <TableHead><Input placeholder="Filtrar utilizador..." value={queueColumnFilters['assigneeName'] || ''} onChange={(e) => setQueueColumnFilters(p => ({...p, assigneeName: e.target.value}))} className="h-8"/></TableHead>
                                        </TableRow>
                                    </>
                                ) : (
                                    <TableRow><TableHead>Nome do Livro</TableHead><TableHead>Projeto</TableHead><TableHead>Estado</TableHead><TableHead>Atribuído Em</TableHead></TableRow>
                                )}
                            </TableHeader>
                            <TableBody>
                                {(canViewAllData ? paginatedQueue : userStats.queue).length > 0 ? (canViewAllData ? paginatedQueue : userStats.queue).map(book => (
                                    <TableRow key={book.id}>
                                        <TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell>
                                        <TableCell>{book.projectName}</TableCell>
                                        <TableCell><Badge variant="secondary">{book.status}</Badge></TableCell>
                                        {canViewAllData ? <TableCell>{(book as any).assigneeName || 'Unassigned'}</TableCell> : <TableCell>{getAssignedDateString(book)}</TableCell>}
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={canViewAllData ? 4 : 4} className="h-24 text-center">{canViewAllData ? 'There are no tasks in any queue.' : 'You have no tasks in your queue.'}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {canViewAllData && <CardFooter className="justify-end"><PaginationNav totalPages={Math.ceil(sortedAndFilteredQueue.length / ITEMS_PER_PAGE)} currentPage={queueCurrentPage} setCurrentPage={setQueueCurrentPage} /></CardFooter>}
                </Card>

                <Card>
                     <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-headline flex items-center gap-2"><History className="h-5 w-5"/>{canViewAllData ? 'Atividade Recente' : 'Minhas Atividades Recentes'}</CardTitle>
                            <CardDescription>{canViewAllData ? 'Todas as ações registradas no sistema.' : 'Últimas 15 ações registradas no sistema.'}</CardDescription>
                           </div>
                           {canViewAllData && (<DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-9 gap-1"><Download className="h-3.5 w-3.5" /><span>Exportar</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Exportar Todos ({sortedAndFilteredHistory.length})</DropdownMenuLabel><DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredHistory, 'history_export.xlsx')}>Exportar como XLSX</DropdownMenuItem><DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredHistory, 'history_export.json')}>Exportar como JSON</DropdownMenuItem><DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredHistory, ['action', 'details', 'user', 'date'], 'history_export.csv')}>Exportar como CSV</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                {canViewAllData ? (
                                    <>
                                        <TableRow>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('action', historySorting, setHistorySorting)}>Action {getSortIndicator('action', historySorting)}</div></TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('user', historySorting, setHistorySorting)}>User {getSortIndicator('user', historySorting)}</div></TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('date', historySorting, setHistorySorting)}>Date {getSortIndicator('date', historySorting)}</div></TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead><Input placeholder="Filtrar ação..." value={historyColumnFilters['action'] || ''} onChange={(e) => setHistoryColumnFilters(p => ({...p, action: e.target.value}))} className="h-8"/></TableHead>
                                            <TableHead><Input placeholder="Filtrar detalhes..." value={historyColumnFilters['details'] || ''} onChange={(e) => setHistoryColumnFilters(p => ({...p, details: e.target.value}))} className="h-8"/></TableHead>
                                            <TableHead><Input placeholder="Filtrar utilizador..." value={historyColumnFilters['user'] || ''} onChange={(e) => setHistoryColumnFilters(p => ({...p, user: e.target.value}))} className="h-8"/></TableHead>
                                            <TableHead><Input placeholder="Filtrar data..." value={historyColumnFilters['date'] || ''} onChange={(e) => setHistoryColumnFilters(p => ({...p, date: e.target.value}))} className="h-8"/></TableHead>
                                        </TableRow>
                                    </>
                                ) : (
                                    <TableRow><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead></TableRow>
                                )}
                            </TableHeader>
                            <TableBody>
                                {(canViewAllData ? paginatedHistory : userStats.history).length > 0 ? (canViewAllData ? paginatedHistory : userStats.history).map(log => (
                                     <TableRow key={log.id}>
                                        <TableCell className="font-medium">{log.action}</TableCell>
                                        <TableCell className="text-muted-foreground">{log.details}</TableCell>
                                        {canViewAllData && <TableCell>{log.user}</TableCell>}
                                        <TableCell>{new Date(log.date).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={canViewAllData ? 4 : 3} className="h-24 text-center">No recent activity found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                     {canViewAllData && <CardFooter className="justify-end"><PaginationNav totalPages={Math.ceil(sortedAndFilteredHistory.length / ITEMS_PER_PAGE)} currentPage={historyCurrentPage} setCurrentPage={setHistoryCurrentPage} /></CardFooter>}
                </Card>
            </div>
        </div>
    )
}
