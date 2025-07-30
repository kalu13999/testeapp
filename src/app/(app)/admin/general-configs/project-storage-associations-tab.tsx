
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
import { type ProjectStorage } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { ProjectStorageAssociationForm, type AssociationFormValues } from "./project-storage-association-form"
import { Badge } from "@/components/ui/badge"

export function ProjectStorageAssociationsTab() {
  const { allProjects, storages, projectStorages, addProjectStorage, updateProjectStorage, deleteProjectStorage } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: ProjectStorage }>({ open: false, type: 'new' })
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: ProjectStorage & { projectName: string, storageName: string } }>({ open: false });

  const enrichedAssociations = React.useMemo(() => {
    return projectStorages.map(ps => {
      const project = allProjects.find(p => p.id === ps.projectId);
      const storage = storages.find(s => s.id === ps.storageId);
      return {
        ...ps,
        projectName: project?.name || 'Unknown Project',
        storageName: storage?.nome || 'Unknown Storage'
      }
    }).sort((a,b) => a.projectName.localeCompare(b.projectName));
  }, [projectStorages, allProjects, storages]);

  const openDialog = (type: 'new' | 'edit', data?: ProjectStorage) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: 'new', data: undefined })
  }

  const handleSave = (values: AssociationFormValues) => {
    if (dialogState.type === 'new') {
      addProjectStorage(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateProjectStorage(values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!deleteDialogState.data) return;
    deleteProjectStorage(deleteDialogState.data.projectId, deleteDialogState.data.storageId);
    setDeleteDialogState({ open: false });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project-Storage Associations</CardTitle>
              <CardDescription>
                Centrally manage which storages are assigned to which projects and their distribution rules.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog('new')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Association
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead className="text-center">Weight</TableHead>
                <TableHead className="text-center">Fixed Min</TableHead>
                <TableHead className="text-center">% Min</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedAssociations.length > 0 ? enrichedAssociations.map((assoc) => (
                <TableRow key={`${assoc.projectId}-${assoc.storageId}`}>
                  <TableCell className="font-medium">{assoc.projectName}</TableCell>
                  <TableCell><Badge variant="secondary">{assoc.storageName}</Badge></TableCell>
                  <TableCell className="text-center">{assoc.peso}</TableCell>
                  <TableCell className="text-center">{assoc.minimo_diario_fixo}</TableCell>
                  <TableCell className="text-center">{assoc.percentual_minimo_diario}%</TableCell>
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
                        <DropdownMenuItem onSelect={() => openDialog('edit', assoc)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, data: assoc })} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No project-storage associations configured.
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
            <DialogTitle>{dialogState.type === 'new' ? 'Add New Association' : 'Edit Association'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Configure a new link between a project and a storage location.' : `Editing association for: ${allProjects.find(p=>p.id === dialogState.data?.projectId)?.name}`}
            </DialogDescription>
          </DialogHeader>
          <ProjectStorageAssociationForm 
            association={dialogState.data} 
            projects={allProjects}
            storages={storages}
            onSave={handleSave} 
            onCancel={closeDialog}
            isEditing={dialogState.type === 'edit'}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogState.open} onOpenChange={() => setDeleteDialogState({ open: false, data: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the association between <span className="font-bold">{deleteDialogState.data?.projectName}</span> and <span className="font-bold">{deleteDialogState.data?.storageName}</span>.
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
