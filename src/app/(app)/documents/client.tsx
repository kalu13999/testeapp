
"use client"

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, PlusCircle, File as FileIcon } from "lucide-react";
import Link from "next/link";
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

type Document = {
  id: string;
  client: string;
  status: string;
  type: string;
  lastUpdated: string;
  name: string;
};

interface DocumentsClientProps {
  documents: Document[];
  clients: string[];
  statuses: string[];
}

type BadgeVariant = "default" | "destructive" | "secondary" | "outline";

const getBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
        case "Delivered":
        case "Finalized":
        case "Scanned":
            return "default";
        case "Rejected":
            return "destructive";
        case "QC Pending":
        case "Processing":
            return "secondary"
        default:
            return "outline";
    }
}

const ITEMS_PER_PAGE = 10;

export default function DocumentsClient({ documents, clients, statuses }: DocumentsClientProps) {
  const [filters, setFilters] = React.useState({
    query: '',
    status: 'all',
    client: 'all'
  });
  const [currentPage, setCurrentPage] = React.useState(1);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };

  const filteredDocuments = React.useMemo(() => {
    return documents.filter(doc => {
      const queryMatch = filters.query.trim() === '' || 
        doc.name.toLowerCase().includes(filters.query.toLowerCase()) || 
        doc.id.toLowerCase().includes(filters.query.toLowerCase());
      
      const statusMatch = filters.status === 'all' || doc.status === filters.status;
      const clientMatch = filters.client === 'all' || doc.client === filters.client;
      
      return queryMatch && statusMatch && clientMatch;
    });
  }, [documents, filters]);
  
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice(
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
            placeholder="Search by ID or name..." 
            className="max-w-xs"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
        />
        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-auto min-w-[150px]">
                <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
        </Select>
        <Select value={filters.client} onValueChange={(value) => handleFilterChange('client', value)}>
            <SelectTrigger className="w-auto min-w-[150px]">
                <SelectValue placeholder="Filter by Client" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => <SelectItem key={client} value={client}>{client}</SelectItem>)}
            </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1">
                <FileIcon className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Export
                </span>
            </Button>
            <Button size="sm" className="h-9 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    New Document
                </span>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">All Documents</CardTitle>
          <CardDescription>
            Manage and track all documents in the workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDocuments.length > 0 ? paginatedDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.id}</TableCell>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.client}</TableCell>
                  <TableCell className="hidden md:table-cell">{doc.type}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(doc.status)}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{doc.lastUpdated}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/documents/${doc.id}`} passHref>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem>Approve</DropdownMenuItem>
                        <DropdownMenuItem>Reject</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedDocuments.length}</strong> of <strong>{filteredDocuments.length}</strong> documents
          </div>
           <PaginationNav />
        </CardFooter>
      </Card>
    </div>
  )
}
