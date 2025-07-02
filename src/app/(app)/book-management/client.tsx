
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, PlusCircle, BookUp, Trash2, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

import type { EnrichedProject, EnrichedBook, BookImport } from "@/context/workflow-context"
import { BookForm } from "./book-form"
import { useAppContext } from "@/context/workflow-context"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"


export default function BookManagementClient() {
  const { projects, books, addBook, updateBook, deleteBook, importBooks } = useAppContext();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'import' | null; data?: EnrichedBook }>({ open: false, type: null })
  
  const [importJson, setImportJson] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();


  const filteredBooks = React.useMemo(() => {
    if (!selectedProjectId) return []
    return books.filter(b => b.projectId === selectedProjectId)
  }, [books, selectedProjectId])

  const openDialog = (type: 'new' | 'edit' | 'delete' | 'import', data?: EnrichedBook) => {
    if ((type === 'new' || type === 'edit' || type === 'import') && !selectedProjectId) {
      toast({
          title: "No Project Selected",
          description: "Please select a project before adding or importing books.",
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

  const handleSave = (values: { name: string; expectedDocuments: number }) => {
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
         <Button variant="outline" onClick={() => openDialog('import')}>
            <BookUp className="mr-2 h-4 w-4"/> Import Book List (JSON)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Book Manifest</CardTitle>
              <CardDescription>Select a project to view and manage its books.</CardDescription>
            </div>
            <div className="flex gap-2">
               <Select onValueChange={setSelectedProjectId} value={selectedProjectId || ""}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <TableHead className="text-center">Expected Pages</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProjectId ? (
                  filteredBooks.length > 0 ? filteredBooks.map(book => (
                      <TableRow key={book.id}>
                          <TableCell className="font-medium">{book.name}</TableCell>
                          <TableCell><Badge variant="outline">{book.status}</Badge></TableCell>
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
                                      <DropdownMenuItem onSelect={() => openDialog('edit', book)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => openDialog('delete', book)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No books found for this project.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Please select a project to see its books.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
           </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent>
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
    </div>
  )
}
