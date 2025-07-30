
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
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
  CardFooter,
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
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

const ITEMS_PER_PAGE = 10;

export function ProjectStorageAssociationsTab() {
  const { allProjects, storages, projectStorages, addProjectStorage, updateProjectStorage, deleteProjectStorage } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: ProjectStorage }>({ open: false, type: 'new' })
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: ProjectStorage & { projectName: string, storageName: string } }>({ open: false });
  
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'projectName', desc: false }]);
  const [currentPage, setCurrentPage] = React.useState(1);

  const handleSort = (columnId: string) => {
    setSorting(currentSorting => {
      if (currentSorting.length > 0 && currentSorting[0].id === columnId) {
        return [{ id: columnId, desc: !currentSorting[0].desc }]
      }
      return [{ id: columnId, desc: false }]
    })
  }

  const getSortIndicator = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId)
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />
  }

  const sortedAndFilteredAssociations = React.useMemo(() => {
    let enriched = projectStorages.map(ps => {
      const project = allProjects.find(p => p.id === ps.projectId);
      const storage = storages.find(s => s.id === ps.storageId);
      return {
        ...ps,
        projectName: project?.name || 'Unknown Project',
        storageName: storage?.nome || 'Unknown Storage'
      }
    });

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        enriched = enriched.filter(assoc => {
          const assocValue = assoc[columnId as keyof typeof assoc];
          return String(assocValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      enriched.sort((a, b) => {
        const s = sorting[0];
        const valA = a[s.id as keyof typeof a];
        const valB = b[s.id as keyof typeof b];
        let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        if (result !== 0) return s.desc ? -result : result;
        return 0;
      });
    }

    return enriched;
  }, [projectStorages, allProjects, storages, columnFilters, sorting]);
  
  const totalPages = Math.ceil(sortedAndFilteredAssociations.length / ITEMS_PER_PAGE);
  const paginatedAssociations = sortedAndFilteredAssociations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          <PaginationItem><PaginationLink href="#">Page {currentPage} of {totalPages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

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
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Project {getSortIndicator('projectName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('storageName')}>Storage {getSortIndicator('storageName')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('peso')}>Weight {getSortIndicator('peso')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('minimo_diario_fixo')}>Fixed Min {getSortIndicator('minimo_diario_fixo')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('percentual_minimo_diario')}>% Min {getSortIndicator('percentual_minimo_diario')}</div></TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
               <TableRow>
                <TableHead><Input placeholder="Filter project..." value={columnFilters['projectName'] || ''} onChange={e => setColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter storage..." value={columnFilters['storageName'] || ''} onChange={e => setColumnFilters(p => ({...p, storageName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead colSpan={3} />
                <TableHead><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAssociations.length > 0 ? paginatedAssociations.map((assoc) => (
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
         <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {`Showing ${paginatedAssociations.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedAssociations.length} of ${sortedAndFilteredAssociations.length} associations`}
            </div>
            <PaginationNav />
        </CardFooter>
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
