
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
import { Info, CheckCircle2, XCircle, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 15;

export default function ValidatedHistoryClient() {
    const { books, auditLogs, currentUser, projects } = useAppContext();

    const [filters, setFilters] = React.useState({ query: '', project: 'all' });
    const [currentPage, setCurrentPage] = React.useState(1);

    const projectNames = [...new Set(projects.map(p => p.name))].sort();

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
        setCurrentPage(1);
    };

    const validationHistory = React.useMemo(() => {
        if (!currentUser) return [];

        // `books` from context is already correctly scoped.
        const relevantBooks = books.filter(book =>
            ['Complete', 'Finalized', 'Client Rejected'].includes(book.status)
        );

        return relevantBooks.map(book => {
            const validationLog = auditLogs.find(log =>
                log.bookId === book.id && (log.action === 'Client Approval' || log.action === 'Client Rejection')
            );
            return {
                ...book,
                validationDate: validationLog ? new Date(validationLog.date).toLocaleDateString() : 'N/A',
                validationStatus: book.status === 'Client Rejected' ? 'Rejected' : 'Approved'
            };
        }).sort((a, b) => {
            if (a.validationDate === 'N/A') return 1;
            if (b.validationDate === 'N/A') return -1;
            return new Date(b.validationDate).getTime() - new Date(a.validationDate).getTime()
        });
    }, [books, auditLogs, currentUser]);

    const filteredHistory = React.useMemo(() => {
        return validationHistory.filter(item => {
            const queryMatch = filters.query.trim() === '' ||
                item.name.toLowerCase().includes(filters.query.toLowerCase()) ||
                (currentUser?.role === 'Admin' && item.clientName.toLowerCase().includes(filters.query.toLowerCase()));
            const projectMatch = filters.project === 'all' || item.projectName === filters.project;
            return queryMatch && projectMatch;
        });
    }, [validationHistory, filters, currentUser?.role]);

    const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = filteredHistory.slice(
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
                {currentUser?.role === 'Admin' && (
                    <div className="flex items-center gap-2 pt-2">
                        <Input
                            placeholder="Search by book or client..."
                            className="max-w-xs"
                            value={filters.query}
                            onChange={(e) => handleFilterChange('query', e.target.value)}
                        />
                        <Select value={filters.project} onValueChange={(value) => handleFilterChange('project', value)}>
                            <SelectTrigger className="w-auto min-w-[180px]">
                                <SelectValue placeholder="Filter by Project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projectNames.map(project => <SelectItem key={project} value={project}>{project}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {paginatedHistory.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Batch Name</TableHead>
                                {currentUser?.role === 'Admin' && <TableHead>Client</TableHead>}
                                <TableHead>Project</TableHead>
                                <TableHead>Outcome</TableHead>
                                <TableHead>Date</TableHead>
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
                                    <TableCell>{book.validationDate}</TableCell>
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
                    Showing <strong>{paginatedHistory.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedHistory.length}</strong> of <strong>{filteredHistory.length}</strong> validated batches
                </div>
                {totalPages > 1 && <PaginationNav />}
            </CardFooter>
        </Card>
    )
}
