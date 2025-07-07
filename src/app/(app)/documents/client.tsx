
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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAppContext, EnrichedBook } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

export default function DocumentsClient() {
  const { books } = useAppContext();
  const { toast } = useToast();
  const [filters, setFilters] = React.useState({
    query: '',
    project: 'all',
    client: 'all'
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);

  const clientNames = [...new Set(books.map(b => b.clientName))].sort();
  const projectNames = [...new Set(books.map(b => b.projectName))].sort();

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };

  const filteredBooks = React.useMemo(() => {
    return books.filter(book => {
      const queryMatch = filters.query.trim() === '' || 
        book.name.toLowerCase().includes(filters.query.toLowerCase());
      
      const projectMatch = filters.project === 'all' || book.projectName === filters.project;
      const clientMatch = filters.client === 'all' || book.clientName === filters.client;
      
      return queryMatch && projectMatch && clientMatch;
    });
  }, [books, filters]);

  const selectedBooks = React.useMemo(() => {
    return filteredBooks.filter(book => selection.includes(book.id));
  }, [filteredBooks, selection]);

  React.useEffect(() => {
    // Clear selection when filters change to avoid confusion
    setSelection([]);
  }, [filters]);
  
  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = filteredBooks.slice(
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

  const copyToClipboard = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        toast({ title: "Copied to Clipboard", description: `${data.length} book(s) copied as JSON.` });
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
                  <DropdownMenuLabel>Export Selected</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>
                      Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>
                      Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => copyToClipboard(selectedBooks)} disabled={selection.length === 0}>
                      Copy as JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Export All ({filteredBooks.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportJSON(filteredBooks)} disabled={filteredBooks.length === 0}>
                      Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(filteredBooks)} disabled={filteredBooks.length === 0}>
                      Export as CSV
                  </DropdownMenuItem>
                   <DropdownMenuItem onSelect={() => copyToClipboard(filteredBooks)} disabled={filteredBooks.length === 0}>
                      Copy as JSON
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
                placeholder="Search by book name..." 
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
            <Select value={filters.client} onValueChange={(value) => handleFilterChange('client', value)}>
                <SelectTrigger className="w-auto min-w-[180px]">
                    <SelectValue placeholder="Filter by Client" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clientNames.map(client => <SelectItem key={client} value={client}>{client}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
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
                <TableHead>Book Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[150px]">Progress</TableHead>
                <TableHead className="text-center w-[120px]">Pages</TableHead>
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
            {selection.length > 0 ? `${selection.length} of ${filteredBooks.length} book(s) selected.` : `Showing ${paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length} of ${filteredBooks.length} books`}
          </div>
           <PaginationNav />
        </CardFooter>
      </Card>
    </div>
  )
}
