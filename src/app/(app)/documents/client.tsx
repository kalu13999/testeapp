
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
import { File as FileIcon } from "lucide-react";
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
import { useAppContext } from "@/context/app-context";

const ITEMS_PER_PAGE = 10;

export default function DocumentsClient() {
  const { books, projects } = useAppContext();
  const [filters, setFilters] = React.useState({
    query: '',
    project: 'all',
    client: 'all'
  });
  const [currentPage, setCurrentPage] = React.useState(1);

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
  
  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
    <div className="flex flex-col gap-4">
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
        <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1">
                <FileIcon className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Export
                </span>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">All Books</CardTitle>
          <CardDescription>
            Manage and track all books in the workflow. Each book is a collection of documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-center">Pages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length > 0 ? paginatedBooks.map((book) => (
                <TableRow key={book.id}>
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
                  <TableCell>
                      <Progress value={book.progress} className="h-2" />
                  </TableCell>
                  <TableCell className="text-center">{book.documentCount} / {book.expectedDocuments}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No books found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length}</strong> of <strong>{filteredBooks.length}</strong> books
          </div>
           <PaginationNav />
        </CardFooter>
      </Card>
    </div>
  )
}
