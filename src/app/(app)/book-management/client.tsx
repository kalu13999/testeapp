
"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
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
import { MoreHorizontal, PlusCircle, BookUp, Trash2, Edit, Info, FolderSearch, ChevronsUpDown, ArrowUp, ArrowDown, Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import type { EnrichedBook, RawBook } from "@/lib/data"
import type { BookImport } from "@/context/workflow-context"
import { BookForm } from "./book-form"
import { useAppContext } from "@/context/workflow-context"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox";

const ITEMS_PER_PAGE = 10;

export default function BookManagementClient() {
  const { books, addBook, updateBook, deleteBook, importBooks, selectedProjectId } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'import' | 'details' | null; data?: EnrichedBook }>({ open: false, type: null })
  
  const [importJson, setImportJson] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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

  const openDialog = (type: 'new' | 'edit' | 'delete' | 'import' | 'details', data?: EnrichedBook) => {
    if ((type === 'new' || type === 'import') && !selectedProjectId) {
      toast({
          title: "No Project Selected",
          description: "Please select a project from the global filter in the header before adding or importing books.",
          variant: "destructive"
      });
      return;
    }
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
    setImportJson("");
  }

  const handleSave = (values: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => {
    if (dialogState.type === 'new' && selectedProjectId) {
      addBook(selectedProjectId, values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateBook(dialogState.data.id, values);
    }
    closeDialog()
  }
  
  const handleDelete = () => {
    if (!dialogState.data) return;
    deleteBook(dialogState.data.id);
    closeDialog()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                setImportJson(text);
            }
        };
        reader.readAsText(file);
    }
  };
  
  const handleImport = () => {
    if (!selectedProjectId) return;
    try {
        const parsedBooks: BookImport[] = JSON.parse(importJson);
        if (!Array.isArray(parsedBooks) || !parsedBooks.every(b => b.name && typeof b.expectedDocuments === 'number')) {
            throw new Error("Invalid JSON format.");
        }
        importBooks(selectedProjectId, parsedBooks);
        closeDialog();
    } catch (error) {
        toast({
            title: "Import Failed",
            description: "The provided text is not valid JSON or doesn't match the required format.",
            variant: "destructive"
        });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Book Management</h1>
          <p className="text-muted-foreground">Load and manage the list of books for each project.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openDialog('import')} disabled={!selectedProjectId}>
                <BookUp className="mr-2 h-4 w-4"/> Import Book List (JSON)
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1" disabled={!selectedProjectId}>
                    <Download className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Copy Selected ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => copyToClipboardJSON(selectedBooks)} disabled={selection.length === 0}>Copy as JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => copyToClipboardCSV(selectedBooks)} disabled={selection.length === 0}>Copy as CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Export All ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Export as XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Export as JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Export as CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Book Manifest</CardTitle>
              <CardDescription>
                {selectedProjectId ? "Showing books for the selected project." : "Select a project from the top bar to manage its books."}
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => openDialog('new')} disabled={!selectedProjectId}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Book
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[40px]">
                          <Checkbox
                              onCheckedChange={(checked) => setSelection(checked ? paginatedBooks.map(b => b.id) : [])}
                              checked={paginatedBooks.length > 0 && paginatedBooks.every(b => selection.includes(b.id))}
                              aria-label="Select all on this page"
                              disabled={paginatedBooks.length === 0}
                          />
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                            Book Name {getSortIndicator('name')}
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
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('expectedDocuments', e.shiftKey)}>
                            Expected Pages {getSortIndicator('expectedDocuments')}
                        </div>
                      </TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                   <TableRow>
                        <TableHead />
                        <TableHead>
                            <Input
                                placeholder="Filter by name..."
                                value={columnFilters['name'] || ''}
                                onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filter by status..."
                                value={columnFilters['status'] || ''}
                                onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filter by priority..."
                                value={columnFilters['priority'] || ''}
                                onChange={(e) => handleColumnFilterChange('priority', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filter by pages..."
                                value={columnFilters['expectedDocuments'] || ''}
                                onChange={(e) => handleColumnFilterChange('expectedDocuments', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead />
                    </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProjectId ? (
                  paginatedBooks.length > 0 ? paginatedBooks.map(book => (
                      <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                          <TableCell>
                              <Checkbox
                                  checked={selection.includes(book.id)}
                                  onCheckedChange={(checked) => setSelection(checked ? [...selection, book.id] : selection.filter((id) => id !== book.id))}
                                  aria-label={`Select book ${book.name}`}
                              />
                          </TableCell>
                          <TableCell className="font-medium">{book.name}</TableCell>
                          <TableCell><Badge variant="outline">{book.status}</Badge></TableCell>
                          <TableCell>{book.priority || '—'}</TableCell>
                          <TableCell className="text-center">{book.expectedDocuments}</TableCell>
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
                                       <DropdownMenuItem onSelect={() => openDialog('details', book)}>
                                        <Info className="mr-2 h-4 w-4" /> Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => openDialog('edit', book)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => openDialog('delete', book)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No books found for this project.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                       <div className="flex flex-col items-center gap-2">
                            <FolderSearch className="h-10 w-10 text-muted-foreground"/>
                            <span className="font-medium">No Project Selected</span>
                            <p className="text-muted-foreground">Please use the global filter in the header to select a project.</p>
                       </div>
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

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Add New Book' : 'Edit Book'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Add a new book to the selected project.' : `Editing book: ${dialogState.data?.name}`}
            </DialogDescription>
          </DialogHeader>
          <BookForm book={dialogState.data} onSave={handleSave} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.open && dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the book <span className="font-bold">{dialogState.data?.name}</span> from the project manifest.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete Book</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.open && dialogState.type === 'import'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Import Books from JSON</DialogTitle>
                <DialogDescription>
                    Upload or paste a JSON file with an array of books.
                    Each object should have a `name` (string) and `expectedDocuments` (number).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Upload File</Button>
                    <p className="text-sm text-muted-foreground">Or paste content below.</p>
                    <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                </div>
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="json-input">JSON Content</Label>
                    <Textarea 
                        id="json-input"
                        placeholder='[{"name": "Book A", "expectedDocuments": 50}, {"name": "Book B", "expectedDocuments": 120}]'
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                        className="h-48 font-mono text-xs"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" onClick={handleImport} disabled={!importJson}>Import Books</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={dialogState.open && dialogState.type === 'details'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
            <DialogDescription>{dialogState.data?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Author</p>
              <p className="col-span-2 font-medium">{dialogState.data?.author || '—'}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">ISBN</p>
              <p className="col-span-2 font-medium">{dialogState.data?.isbn || '—'}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Publication Year</p>
              <p className="col-span-2 font-medium">{dialogState.data?.publicationYear || '—'}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Priority</p>
              <p className="col-span-2 font-medium">{dialogState.data?.priority || '—'}</p>
            </div>
            {dialogState.data?.info && (
              <div className="grid grid-cols-3 items-start gap-x-4">
                <p className="text-muted-foreground">Additional Info</p>
                <p className="col-span-2 font-medium whitespace-pre-wrap">{dialogState.data.info}</p>
              </div>
            )}
          </div>
           <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
