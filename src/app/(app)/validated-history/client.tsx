
"use client"

import * as React from "react";
import * as XLSX from 'xlsx';
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
import { Info, CheckCircle2, XCircle, History, ArrowUp, ArrowDown, ChevronsUpDown, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EnrichedBook } from "@/lib/data";

const ITEMS_PER_PAGE = 15;

type ValidatedBook = EnrichedBook & { validationDate: string, validationStatus: 'Approved' | 'Rejected' };

export default function ValidatedHistoryClient() {
    const { books, auditLogs, currentUser, projects } = useAppContext();
    const { toast } = useToast();

    const [filters, setFilters] = React.useState({ query: '', project: 'all', outcome: 'all' });
    const [currentPage, setCurrentPage] = React.useState(1);
    const [selection, setSelection] = React.useState<string[]>([]);
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

    const validationHistory: ValidatedBook[] = React.useMemo(() => {
        if (!currentUser) return [];

        let relevantBooks;
        if (currentUser.role === 'Admin') {
            relevantBooks = books.filter(book => ['Complete', 'Finalized', 'Client Rejected'].includes(book.status));
        } else {
            relevantBooks = books.filter(book => book.clientId === currentUser.clientId && ['Complete', 'Finalized', 'Client Rejected'].includes(book.status));
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

    const globalSearch = (item: object, query: string) => {
        if (!query) return true;
        const lowerCaseQuery = query.toLowerCase();

        for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
                const value = item[key as keyof typeof item];
                if (typeof value === 'string' || typeof value === 'number') {
                    if (String(value).toLowerCase().includes(lowerCaseQuery)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const sortedAndFilteredHistory = React.useMemo(() => {
        let filtered = validationHistory.filter(item => {
            const queryMatch = globalSearch(item, filters.query);
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
    }, [validationHistory, filters, sorting]);
    
    const selectedHistory = React.useMemo(() => {
        return sortedAndFilteredHistory.filter(item => selection.includes(item.id));
    }, [sortedAndFilteredHistory, selection]);

    React.useEffect(() => {
        setSelection([]);
    }, [filters, sorting]);


    const totalPages = Math.ceil(sortedAndFilteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = sortedAndFilteredHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    
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

    const exportJSON = (data: ValidatedBook[]) => {
        if (data.length === 0) return;
        const jsonString = JSON.stringify(data, null, 2);
        downloadFile(jsonString, 'history_export.json', 'application/json');
        toast({ title: "Export Successful", description: `${data.length} items exported as JSON.` });
    }

    const exportCSV = (data: ValidatedBook[]) => {
        if (data.length === 0) return;
        const headers = ['id', 'name', 'clientName', 'projectName', 'validationStatus', 'validationDate', 'rejectionReason'];
        const csvContent = [
            headers.join(','),
            ...data.map(item => 
                headers.map(header => {
                    let value = item[header as keyof ValidatedBook] ?? '';
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        downloadFile(csvContent, 'history_export.csv', 'text/csv;charset=utf-8;');
        toast({ title: "Export Successful", description: `${data.length} items exported as CSV.` });
    }

    const exportXLSX = (data: ValidatedBook[]) => {
        if (data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Validated History");
        XLSX.writeFile(workbook, "history_export.xlsx");
        toast({ title: "Export Successful", description: `${data.length} items exported as XLSX.` });
    }


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
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-headline">Validated History</CardTitle>
                        <CardDescription>History of all approved and rejected document batches.</CardDescription>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 gap-1">
                                <Download className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => exportXLSX(selectedHistory)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportJSON(selectedHistory)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportCSV(selectedHistory)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Export All ({sortedAndFilteredHistory.length})</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredHistory)} disabled={sortedAndFilteredHistory.length === 0}>Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredHistory)} disabled={sortedAndFilteredHistory.length === 0}>Export as JSON</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredHistory)} disabled={sortedAndFilteredHistory.length === 0}>Export as CSV</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Input
                        placeholder="Search all columns..."
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
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        onCheckedChange={(checked) => setSelection(checked ? paginatedHistory.map(h => h.id) : [])}
                                        checked={paginatedHistory.length > 0 && paginatedHistory.every(h => selection.includes(h.id))}
                                        aria-label="Select all on this page"
                                    />
                                </TableHead>
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
                                <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                                    <TableCell>
                                        <Checkbox
                                        checked={selection.includes(book.id)}
                                        onCheckedChange={(checked) => {
                                            setSelection(
                                            checked
                                                ? [...selection, book.id]
                                                : selection.filter((id) => id !== book.id)
                                            )
                                        }}
                                        aria-label={`Select item ${book.name}`}
                                        />
                                    </TableCell>
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
                   {selection.length > 0 ? `${selection.length} of ${sortedAndFilteredHistory.length} item(s) selected.` : `Showing ${paginatedHistory.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedHistory.length} of ${sortedAndFilteredHistory.length} validated batches`}
                </div>
                {totalPages > 1 && <PaginationNav />}
            </CardFooter>
        </Card>
    )
}
