
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react"
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
import { type RejectionTag } from "@/lib/data"
import { ReasonForm } from "./reason-form"
import { useAppContext } from "@/context/workflow-context"

export default function RejectionReasonsClient() {
  const { rejectionTags, addRejectionTag, updateRejectionTag, deleteRejectionTag, currentUser } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: RejectionTag }>({ open: false, type: 'new' })

  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: RejectionTag }>({ open: false });

  const clientRejectionTags = React.useMemo(() => {
    if (!currentUser || !currentUser.clientId) return [];
    return rejectionTags.filter(tag => tag.clientId === currentUser.clientId);
  }, [rejectionTags, currentUser]);

  const openDialog = (type: 'new' | 'edit', data?: RejectionTag) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: 'new', data: undefined })
  }

  const handleSave = (values: Omit<RejectionTag, 'id' | 'clientId'>) => {
    if (dialogState.type === 'new') {
      addRejectionTag(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateRejectionTag(dialogState.data.id, values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!deleteDialogState.data) return;
    deleteRejectionTag(deleteDialogState.data.id);
    setDeleteDialogState({ open: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Rejection Reasons</h1>
          <p className="text-muted-foreground">Manage your custom tags for rejecting documents.</p>
        </div>
        <Button onClick={() => openDialog('new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Reason
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRejectionTags.length > 0 ? clientRejectionTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium">{tag.label}</TableCell>
                  <TableCell>{tag.description}</TableCell>
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
                        <DropdownMenuItem onSelect={() => openDialog('edit', tag)}>
                           <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, data: tag })} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No rejection reasons defined. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Create New Reason' : 'Edit Reason'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Add a new rejection tag for your team to use.' : `Editing reason: ${dialogState.data?.label}`}
            </DialogDescription>
          </DialogHeader>
          <ReasonForm reason={dialogState.data} onSave={handleSave} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogState.open} onOpenChange={() => setDeleteDialogState({ open: false, data: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reason <span className="font-bold">{deleteDialogState.data?.label}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogState({ open: false, data: undefined })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
