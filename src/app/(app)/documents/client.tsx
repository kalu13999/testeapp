
"use client"

import * as React from "react";
import Link from "next/link";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAppContext, EnrichedBook } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

export default function DocumentsClient() {
  const { books } = useAppContext();
  const { toast } = useToast();
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
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
    let filtered = books;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof EnrichedBook] ?? (columnId === 'priority' ? 'Medium' : '');
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
                const valA = a[key] ?? (key === 'priority' ? 'Medium' : '');
                const valB = b[key] ?? (key === 'priority' ? 'Medium' : '');

                let result = 0;
                if (key === 'priority') {
                    const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
                    result = order[valA as 'High' | 'Medium' | 'Low'] - order[valB as 'High' | 'Medium' | 'Low'];
                } else if (typeof valA === 'number' && typeof valB === 'number') {
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
  }, [books, columnFilters, sorting]);

  const selectedBooks = React.useMemo(() => {
    return sortedAndFilteredBooks.filter(book => selection.includes(book.id));
  }, [sortedAndFilteredBooks, selection]);

  React.useEffect(() => {
    setSelection([]);
  }, [columnFilters, sorting]);
  
  const totalPages = Math.ceil(sortedAndFilteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = sortedAndFilteredBooks.slice(
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

  const exportJSON = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'books_export.json', 'application/json');
    toast({ title: "Export Successful", description: `${data.length} books exported as JSON.` });
  }

  const exportCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'status', 'priority', 'projectName', 'clientName', 'expectedDocuments', 'documentCount', 'progress', 'author', 'isbn', 'publicationYear', 'info'];
    const csvContent = [
        headers.join(','),
        ...data.map(book => 
            headers.map(header => {
                let value = book[header as keyof EnrichedBook] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, 'books_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Export Successful", description: `${data.length} books exported as CSV.` });
  }

  const exportXLSX = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "books_export.xlsx");
    toast({ title: "Export Successful", description: `${data.length} books exported as XLSX.` });
  }

  const copyToClipboardJSON = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        toast({ title: "Copied to Clipboard", description: `${data.length} book(s) copied as JSON.` });
    }, () => {
        toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    });
  }

  const copyToClipboardCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'status', 'priority', 'projectName', 'clientName', 'expectedDocuments', 'documentCount', 'progress', 'author', 'isbn', 'publicationYear', 'info'];
    const csvContent = [
        headers.join(','),
        ...data.map(book => 
            headers.map(header => {
                let value = book[header as keyof EnrichedBook] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    navigator.clipboard.writeText(csvContent).then(() => {
        toast({ title: "Copied to Clipboard", description: `${data.length} book(s) copied as CSV.` });
    }, () => {
        toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    });
  }

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) {
            pageNumbers.push(-1); // Ellipsis
        }

        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 2) {
            end = 3;
        }
        if (currentPage >= totalPages - 1) {
            start = totalPages - 2;
        }

        for (let i = start; i <= end; i++) {
            pageNumbers.push(i);
        }
        
        if (currentPage < totalPages - 2) {
            pageNumbers.push(-1); // Ellipsis
        }
        pageNumbers.push(totalPages);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} 
              className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {pageNumbers.map((num, index) => (
             num === -1 ? (
                <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                </PaginationItem>
             ) : (
                <PaginationItem key={num}>
                    <PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>
                        {num}
                    </PaginationLink>
                </PaginationItem>
             )
          ))}
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">All Books</h1>
          <p className="text-muted-foreground">Manage and track all books in the workflow.</p>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Export
                    </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>
                      Export as XLSX
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>
                      Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>
                      Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Copy Selected ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => copyToClipboardJSON(selectedBooks)} disabled={selection.length === 0}>
                      Copy as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => copyToClipboardCSV(selectedBooks)} disabled={selection.length === 0}>
                      Copy as CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Export All ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Export as XLSX
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Copy All ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                   <DropdownMenuItem onSelect={() => copyToClipboardJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Copy as JSON
                   </DropdownMenuItem>
                   <DropdownMenuItem onSelect={() => copyToClipboardCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Copy as CSV
                   </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      setSelection(checked ? paginatedBooks.map(b => b.id) : [])
                    }}
                    checked={paginatedBooks.length > 0 && paginatedBooks.every(b => selection.includes(b.id))}
                    aria-label="Select all on this page"
                  />
                </TableHead>
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
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('clientName', e.shiftKey)}>
                        Client {getSortIndicator('clientName')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>
                        Status {getSortIndicator('status')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('priority', e.shiftKey)}>
                        Priority {getSortIndicator('priority')}
                    </div>
                </TableHead>
                <TableHead className="w-[150px]">Progress</TableHead>
                <TableHead className="text-center w-[120px]">
                     <div className="flex items-center gap-2 cursor-pointer select-none group justify-center" onClick={(e) => handleSort('documentCount', e.shiftKey)}>
                        Pages {getSortIndicator('documentCount')}
                    </div>
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead/>
                <TableHead>
                    <Input placeholder="Filter Name..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filter Project..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filter Client..." value={columnFilters['clientName'] || ''} onChange={(e) => handleColumnFilterChange('clientName', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filter Status..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filter Priority..." value={columnFilters['priority'] || ''} onChange={(e) => handleColumnFilterChange('priority', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead/>
                <TableHead/>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length > 0 ? paginatedBooks.map((book) => (
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
                      aria-label={`Select book ${book.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/books/${book.id}`} className="hover:underline">
                      {book.name}
                    </Link>
                  </TableCell>
                  <TableCell>{book.projectName}</TableCell>
                  <TableCell>{book.clientName}</TableCell>
                  <TableCell>
                    <Badge variant={book.status === 'Complete' ? "default" : "outline"}>{book.status}</Badge>
                  </TableCell>
                   <TableCell>{book.priority || "Medium"}</TableCell>
                  <TableCell>
                      <Progress value={book.progress} className="h-2" />
                  </TableCell>
                  <TableCell className="text-center">{book.documentCount} / {book.expectedDocuments}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No books found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selection.length > 0 ? `${selection.length} of ${sortedAndFilteredBooks.length} book(s) selected.` : `Showing ${paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length} of ${sortedAndFilteredBooks.length} books`}
          </div>
           <PaginationNav />
        </CardFooter>
      </Card>
    </div>
  )
}
