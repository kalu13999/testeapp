
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MoreHorizontal, PlusCircle, BookUp, Trash2, Edit, Info, FolderSearch } from "lucide-react"
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

import type { EnrichedBook, BookImport, RawBook } from "@/context/workflow-context"
import { BookForm } from "./book-form"
import { useAppContext } from "@/context/workflow-context"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"


export default function BookManagementClient() {
  const { books, addBook, updateBook, deleteBook, importBooks, selectedProjectId } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'import' | 'details' | null; data?: EnrichedBook }>({ open: false, type: null })
  
  const [importJson, setImportJson] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleSave = (values: Omit<RawBook, 'id' | 'projectId' | 'status'>) => {
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
        // Basic validation
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
         <Button variant="outline" onClick={() => openDialog('import')} disabled={!selectedProjectId}>
            <BookUp className="mr-2 h-4 w-4"/> Import Book List (JSON)
        </Button>
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
                      <TableHead>Book Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-center">Expected Pages</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProjectId ? (
                  books.length > 0 ? books.map(book => (
                      <TableRow key={book.id}>
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
                      <TableCell colSpan={5} className="h-24 text-center">
                        No books found for this project.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
