
"use client"

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppContext } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CheckCircle2, XCircle, History, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 15;

export default function ValidatedHistoryClient() {
    const { books, auditLogs, currentUser, projects } = useAppContext();

    const [filters, setFilters] = React.useState({ query: '', project: 'all', outcome: 'all' });
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
        { id: 'validationDate', desc: true }
    ]);

    const projectNames = [...new Set(projects.map(p => p.name))].sort();

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
        setCurrentPage(1);
    };

    const handleSort = (columnId: string, isShift: boolean) => {
        setSorting(currentSorting => {
            const existingSortIndex = currentSorting.findIndex(s => s.id === columnId);

            if (isShift) {
                let newSorting = [...currentSorting];
                if (existingSortIndex > -1) {
                    if (newSorting[existingSortIndex].desc) {
                        newSorting.splice(existingSortIndex, 1);
                    } else {
                        newSorting[existingSortIndex].desc = true;
                    }
                } else {
                    newSorting.push({ id: columnId, desc: false });
                }
                return newSorting;
            } else {
                if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                    if (currentSorting[0].desc) {
                        return [];
                    }
                    return [{ id: columnId, desc: true }];
                }
                return [{ id: columnId, desc: false }];
            }
        });
    };

    const getSortIndicator = (columnId: string) => {
        const sortIndex = sorting.findIndex(s => s.id === columnId);
        if (sortIndex === -1) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
        
        const sort = sorting[sortIndex];
        const icon = sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
        
        return (
            <div className="flex items-center gap-1">
                {icon}
                {sorting.length > 1 && (
                    <span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>
                )}
            </div>
        );
    }

    const validationHistory = React.useMemo(() => {
        if (!currentUser) return [];

        let relevantBooks;
        if (currentUser.role === 'Admin') {
            relevantBooks = books.filter(book => ['Complete', 'Finalized', 'Client Rejected'].includes(book.status));
        } else {
            relevantBooks = books.filter(book => ['Complete', 'Finalized', 'Client Rejected'].includes(book.status));
        }

        return relevantBooks.map(book => {
            const validationLog = auditLogs.find(log =>
                log.bookId === book.id && (log.action === 'Client Approval' || log.action === 'Client Rejection')
            );
            return {
                ...book,
                validationDate: validationLog ? new Date(validationLog.date).toISOString() : 'N/A',
                validationStatus: book.status === 'Client Rejected' ? 'Rejected' : 'Approved'
            };
        });
    }, [books, auditLogs, currentUser]);

    const sortedAndFilteredHistory = React.useMemo(() => {
        let filtered = validationHistory.filter(item => {
            const queryMatch = filters.query.trim() === '' ||
                item.name.toLowerCase().includes(filters.query.toLowerCase()) ||
                (currentUser?.role === 'Admin' && item.clientName.toLowerCase().includes(filters.query.toLowerCase()));
            const projectMatch = filters.project === 'all' || item.projectName === filters.project;
            const outcomeMatch = filters.outcome === 'all' || item.validationStatus === filters.outcome;
            return queryMatch && projectMatch && outcomeMatch;
        });

        if (sorting.length > 0) {
            filtered.sort((a, b) => {
                for (const s of sorting) {
                    const key = s.id as keyof typeof filtered[0];
                    const valA = a[key];
                    const valB = b[key];

                    let result = 0;
                    if (valA === null || valA === undefined || valA === 'N/A') result = -1;
                    else if (valB === null || valB === undefined || valB === 'N/A') result = 1;
                    else if (typeof valA === 'number' && typeof valB === 'number') {
                        result = valA - valB;
                    } else {
                        result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    }

                    if (result !== 0) {
                        return s.desc ? -result : result;
                    }
                }
                return 0;
            });
        }
        return filtered;
    }, [validationHistory, filters, sorting, currentUser?.role]);

    const totalPages = Math.ceil(sortedAndFilteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = sortedAndFilteredHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const PaginationNav = () => {
        if (totalPages <= 1) return null;
        const pageNumbers: number[] = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) { pageNumbers.push(i); }
        } else {
            pageNumbers.push(1);
            if (currentPage > 3) { pageNumbers.push(-1); }
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            if (currentPage <= 2) { end = 3; }
            if (currentPage >= totalPages - 1) { start = totalPages - 2; }
            for (let i = start; i <= end; i++) { pageNumbers.push(i); }
            if (currentPage < totalPages - 2) { pageNumbers.push(-1); }
            pageNumbers.push(totalPages);
        }
        
        return (
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
              {pageNumbers.map((num, i) => num === -1 ? <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={num}><PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>{num}</PaginationLink></PaginationItem>)}
              <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
            </PaginationContent>
          </Pagination>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Validated History</CardTitle>
                <CardDescription>History of all approved and rejected document batches.</CardDescription>
                
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Input
                        placeholder={currentUser?.role === 'Admin' ? "Search by book or client..." : "Search by book name..."}
                        className="max-w-xs"
                        value={filters.query}
                        onChange={(e) => handleFilterChange('query', e.target.value)}
                    />
                    {currentUser?.role === 'Admin' && (
                        <Select value={filters.project} onValueChange={(value) => handleFilterChange('project', value)}>
                            <SelectTrigger className="w-auto min-w-[180px]">
                                <SelectValue placeholder="Filter by Project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projectNames.map(project => <SelectItem key={project} value={project}>{project}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                     <Select value={filters.outcome} onValueChange={(value) => handleFilterChange('outcome', value)}>
                        <SelectTrigger className="w-auto min-w-[180px]">
                            <SelectValue placeholder="Filter by Outcome" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Outcomes</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
            </CardHeader>
            <CardContent>
                {paginatedHistory.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                                        Batch Name {getSortIndicator('name')}
                                    </div>
                                </TableHead>
                                {currentUser?.role === 'Admin' && <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('clientName', e.shiftKey)}>
                                        Client {getSortIndicator('clientName')}
                                    </div>
                                </TableHead>}
                                <TableHead>
                                     <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>
                                        Project {getSortIndicator('projectName')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                     <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('validationStatus', e.shiftKey)}>
                                        Outcome {getSortIndicator('validationStatus')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                     <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('validationDate', e.shiftKey)}>
                                        Date {getSortIndicator('validationDate')}
                                    </div>
                                </TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedHistory.map(book => (
                                <TableRow key={book.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                    </TableCell>
                                    {currentUser?.role === 'Admin' && <TableCell>{book.clientName}</TableCell>}
                                    <TableCell>{book.projectName}</TableCell>
                                    <TableCell>
                                        {book.validationStatus === 'Approved' ? (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">
                                                <CheckCircle2 className="mr-2 h-4 w-4"/>
                                                Approved
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <XCircle className="mr-2 h-4 w-4"/>
                                                Rejected
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{book.validationDate !== 'N/A' ? new Date(book.validationDate).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        {book.rejectionReason ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-5 w-5 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{book.rejectionReason}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                        <History className="h-16 w-16" />
                        <h3 className="text-xl font-semibold">No History Found</h3>
                        <p>No validated or rejected batches found matching your criteria.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    Showing <strong>{paginatedHistory.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedHistory.length}</strong> of <strong>{sortedAndFilteredHistory.length}</strong> validated batches
                </div>
                {totalPages > 1 && <PaginationNav />}
            </CardFooter>
        </Card>
    )
}
