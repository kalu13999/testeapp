"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sliders, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type DocumentStatus, type EnrichedBook } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const ITEMS_PER_PAGE = 15;

interface StatusOverrideClientProps {
    allStatuses: DocumentStatus[];
}

export default function StatusOverrideClient({ allStatuses }: StatusOverrideClientProps) {
  const { books, handleAdminStatusOverride, projects } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });
  const [newStatus, setNewStatus] = React.useState('');
  const [reason, setReason] = React.useState('');

  const [filters, setFilters] = React.useState({ query: '', project: 'all', status: 'all' });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const projectNames = [...new Set(projects.map(p => p.name))].sort();
  const statusNames = allStatuses.map(s => s.name).sort();

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

  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books.filter(book => {
        const queryMatch = filters.query.trim() === '' ||
            book.name.toLowerCase().includes(filters.query.toLowerCase()) ||
            book.projectName.toLowerCase().includes(filters.query.toLowerCase()) ||
            book.clientName.toLowerCase().includes(filters.query.toLowerCase());
        const projectMatch = filters.project === 'all' || book.projectName === filters.project;
        const statusMatch = filters.status === 'all' || book.status === filters.status;
        return queryMatch && projectMatch && statusMatch;
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
                const valA = a[key];
                const valB = b[key];

                let result = 0;
                if (valA === null || valA === undefined) result = -1;
                else if (valB === null || valB === undefined) result = 1;
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
  }, [books, filters, sorting]);

  const totalPages = Math.ceil(sortedAndFilteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = sortedAndFilteredBooks.slice(
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

  const openDialog = (book: EnrichedBook) => {
    setDialogState({ open: true, book });
    setNewStatus(book.status);
    setReason('');
  }

  const closeDialog = () => {
    setDialogState({ open: false, book: undefined })
    setNewStatus('');
    setReason('');
  }

  const handleSave = () => {
    if (dialogState.book && newStatus && reason) {
      handleAdminStatusOverride(dialogState.book.id, newStatus, reason);
      closeDialog();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Admin Status Override</h1>
          <p className="text-muted-foreground">Manually change the status of any book in the system. Use with caution.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
                placeholder="Search by book, project, or client..." 
                className="max-w-sm"
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
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-auto min-w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusNames.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                        Book Name {getSortIndicator('name')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>
                        Project {getSortIndicator('projectName')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>
                        Current Status {getSortIndicator('status')}
                    </div>
                </TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length > 0 ? paginatedBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">
                     <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                  </TableCell>
                  <TableCell>{book.projectName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{book.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => openDialog(book)}>
                        <Sliders className="mr-2 h-4 w-4" />
                        Change Status
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No books found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing <strong>{paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length}</strong> of <strong>{sortedAndFilteredBooks.length}</strong> books
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Override Status for: {dialogState.book?.name}</DialogTitle>
            <DialogDescription>
              Select a new status and provide a mandatory reason for this override. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="new-status">New Status</Label>
                 <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="new-status">
                        <SelectValue placeholder="Select a new status" />
                    </SelectTrigger>
                    <SelectContent>
                        {allStatuses.map(status => (
                            <SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="reason">Reason for Override</Label>
                <Textarea 
                    id="reason"
                    placeholder="e.g., Correcting an operator error during QC."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!newStatus || !reason.trim() || newStatus === dialogState.book?.status}>
              Confirm and Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
