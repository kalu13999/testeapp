
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

import type { Project, BookWithProject } from "@/lib/data"
import { BookForm } from "./book-form"


interface BookManagementClientProps {
  projects: Project[]
  initialBooks: BookWithProject[]
}

export default function BookManagementClient({ projects, initialBooks }: BookManagementClientProps) {
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [books, setBooks] = React.useState(initialBooks)
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | null; data?: BookWithProject }>({ open: false, type: null })

  const filteredBooks = React.useMemo(() => {
    if (!selectedProjectId) return []
    return books.filter(b => b.projectId === selectedProjectId)
  }, [books, selectedProjectId])

  const openDialog = (type: 'new' | 'edit' | 'delete', data?: BookWithProject) => {
    if ((type === 'new' || type === 'edit') && !selectedProjectId) {
      // Ideally show a toast or message to select a project first.
      console.error("Please select a project first.")
      return;
    }
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
  }

  const handleSave = (values: { name: string; expectedDocuments: number }) => {
    if (dialogState.type === 'new' && selectedProjectId) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const newBook: BookWithProject = {
        id: `book_${Date.now()}`,
        name: values.name,
        expectedDocuments: values.expectedDocuments,
        status: 'Pending',
        documentCount: 0,
        progress: 0,
        projectId: selectedProjectId,
        projectName: selectedProject?.name || 'Unknown',
        clientName: selectedProject?.clientName || 'Unknown',
      }
      setBooks(prev => [...prev, newBook])
    } else if (dialogState.type === 'edit' && dialogState.data) {
      setBooks(prev => prev.map(b => b.id === dialogState.data!.id ? { ...b, ...values } : b))
    }
    closeDialog()
  }
  
  const handleDelete = () => {
    if (!dialogState.data) return;
    setBooks(prev => prev.filter(b => b.id !== dialogState.data!.id))
    closeDialog()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Book Management</h1>
          <p className="text-muted-foreground">Load and manage the list of books for each project.</p>
        </div>
         <Button variant="outline">
            <BookUp className="mr-2 h-4 w-4"/> Import Book List (JSON/XLS)
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
    </div>
  )
}
