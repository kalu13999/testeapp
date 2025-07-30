
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, CheckCircle, XCircle, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
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
import { type Storage } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { StorageForm, type StorageFormValues } from "./storage-form"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

const ITEMS_PER_PAGE = 10;

export function StorageConfigTab() {
  const { storages, addStorage, updateStorage, deleteStorage } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: Storage }>({ open: false, type: 'new' })
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: Storage }>({ open: false });
  
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'nome', desc: false }]);
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

  const sortedAndFilteredStorages = React.useMemo(() => {
    let filtered = [...(storages || [])];
    
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(storage => {
          const storageValue = storage[columnId as keyof Storage];
          return String(storageValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered.sort((a, b) => {
        const s = sorting[0];
        const valA = a[s.id as keyof Storage];
        const valB = b[s.id as keyof Storage];
        let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        if (result !== 0) return s.desc ? -result : result;
        return 0;
      });
    }
    return filtered;
  }, [storages, columnFilters, sorting]);
  
  const totalPages = Math.ceil(sortedAndFilteredStorages.length / ITEMS_PER_PAGE);
  const paginatedStorages = sortedAndFilteredStorages.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
      updateStorage(String(dialogState.data.id), values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!deleteDialogState.data) return;
    deleteStorage(String(deleteDialogState.data.id));
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
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('nome')}>Name {getSortIndicator('nome')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('ip')}>IP Address {getSortIndicator('ip')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('root_path')}>Root Path {getSortIndicator('root_path')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}>Status {getSortIndicator('status')}</div></TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
               <TableRow>
                <TableHead><Input placeholder="Filter name..." value={columnFilters['nome'] || ''} onChange={e => setColumnFilters(p => ({...p, nome: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter IP..." value={columnFilters['ip'] || ''} onChange={e => setColumnFilters(p => ({...p, ip: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter path..." value={columnFilters['root_path'] || ''} onChange={e => setColumnFilters(p => ({...p, root_path: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter status..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStorages.length > 0 ? paginatedStorages.map((storage) => (
                <TableRow key={storage.id}>
                  <TableCell className="font-medium">{storage.nome}</TableCell>
                  <TableCell>{storage.ip}</TableCell>
                  <TableCell className="font-mono text-xs">{storage.root_path}</TableCell>
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
         <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {`Showing ${paginatedStorages.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedStorages.length} of ${sortedAndFilteredStorages.length} storages`}
            </div>
            <PaginationNav />
        </CardFooter>
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
