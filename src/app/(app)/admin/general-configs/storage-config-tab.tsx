
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, CheckCircle, XCircle } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Storage } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { StorageForm, type StorageFormValues } from "./storage-form"

export function StorageConfigTab() {
  const { storages, addStorage, updateStorage, deleteStorage } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: Storage }>({ open: false, type: 'new' })
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: Storage }>({ open: false });

  const openDialog = (type: 'new' | 'edit', data?: Storage) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: 'new', data: undefined })
  }

  const handleSave = (values: StorageFormValues) => {
    if (dialogState.type === 'new') {
      addStorage(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateStorage(dialogState.data.id, values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!deleteDialogState.data) return;
    deleteStorage(deleteDialogState.data.id);
    setDeleteDialogState({ open: false });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storage Locations</CardTitle>
              <CardDescription>
                Manage the physical or network locations where scanned documents are stored.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog('new')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Storage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Root Path</TableHead>
                <TableHead>Thumbnails Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storages.length > 0 ? storages.map((storage) => (
                <TableRow key={storage.id}>
                  <TableCell className="font-medium">{storage.nome}</TableCell>
                  <TableCell>{storage.ip}</TableCell>
                  <TableCell className="font-mono text-xs">{storage.root_path}</TableCell>
                  <TableCell className="font-mono text-xs">{storage.thumbs_path}</TableCell>
                  <TableCell>
                    <Badge variant={storage.status === 'ativo' ? 'default' : 'secondary'}>
                      {storage.status === 'ativo' ? <CheckCircle className="mr-2 h-3 w-3 text-green-400" /> : <XCircle className="mr-2 h-3 w-3 text-muted-foreground" />}
                      {storage.status}
                    </Badge>
                  </TableCell>
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
                        <DropdownMenuItem onSelect={() => openDialog('edit', storage)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, data: storage })} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No storage locations configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Add New Storage' : 'Edit Storage'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Configure a new storage location.' : `Editing storage: ${dialogState.data?.nome}`}
            </DialogDescription>
          </DialogHeader>
          <StorageForm 
            storage={dialogState.data} 
            onSave={handleSave} 
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogState.open} onOpenChange={() => setDeleteDialogState({ open: false, data: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the storage location <span className="font-bold">{deleteDialogState.data?.nome}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogState({ open: false, data: undefined })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
