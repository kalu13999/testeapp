
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, CheckCircle, XCircle, ChevronsUpDown, ArrowDown, ArrowUp } from "lucide-react"
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
import { type Scanner } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { ScannerForm, type ScannerFormValues } from "./scanner-form"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

const ITEMS_PER_PAGE = 50;

export function ScannerConfigTab() {
  const { scanners, addScanner, updateScanner, deleteScanner } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: Scanner }>({ open: false, type: 'new' })
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: Scanner }>({ open: false });
  
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

  const sortedAndFilteredScanners = React.useMemo(() => {
    let filtered = [...(scanners || [])];
    
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(scanner => {
          const scannerValue = scanner[columnId as keyof Scanner];
          return String(scannerValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered.sort((a, b) => {
        const s = sorting[0];
        const valA = a[s.id as keyof Scanner];
        const valB = b[s.id as keyof Scanner];
        let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        if (result !== 0) return s.desc ? -result : result;
        return 0;
      });
    }
    return filtered;
  }, [scanners, columnFilters, sorting]);

  const totalPages = Math.ceil(sortedAndFilteredScanners.length / ITEMS_PER_PAGE);
  const paginatedScanners = sortedAndFilteredScanners.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  const openDialog = (type: 'new' | 'edit', data?: Scanner) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: 'new', data: undefined })
  }

  const handleSave = (values: ScannerFormValues) => {
    if (dialogState.type === 'new') {
      addScanner(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateScanner(dialogState.data.id, values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!deleteDialogState.data) return;
    deleteScanner(deleteDialogState.data.id);
    setDeleteDialogState({ open: false });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dispositivos de Scanner</CardTitle>
              <CardDescription>
                Gerir todos os dispositivos de scanner registados e configurações de rede onde os documentos são digitalizados.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog('new')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Scanner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('nome')}><span className="text-sm font-medium">Nome</span> {getSortIndicator('nome')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('ip')}><span className="text-sm font-medium">Endereço IP</span> {getSortIndicator('ip')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('scanner_root_folder')}><span className="text-sm font-medium">Localização Raiz</span> {getSortIndicator('scanner_root_folder')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}><span className="text-sm font-medium">Estado</span> {getSortIndicator('status')}</div></TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
               <TableRow>
                <TableHead><Input placeholder="Filtrar nome..." value={columnFilters['nome'] || ''} onChange={e => setColumnFilters(p => ({...p, nome: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar IP..." value={columnFilters['ip'] || ''} onChange={e => setColumnFilters(p => ({...p, ip: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar caminho..." value={columnFilters['scanner_root_folder'] || ''} onChange={e => setColumnFilters(p => ({...p, scanner_root_folder: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Limpar Filtros</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedScanners.length > 0 ? paginatedScanners.map((scanner) => (
                <TableRow key={scanner.id}>
                  <TableCell className="font-medium">{scanner.nome}</TableCell>
                  <TableCell>{scanner.ip}</TableCell>
                  <TableCell className="font-mono text-xs">{scanner.scanner_root_folder}</TableCell>
                  <TableCell>
                    <Badge variant={scanner.status === 'ativo' ? 'default' : 'secondary'}>
                      {scanner.status === 'ativo' ? <CheckCircle className="mr-2 h-3 w-3 text-green-400" /> : <XCircle className="mr-2 h-3 w-3 text-muted-foreground" />}
                      {scanner.status}
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
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openDialog('edit', scanner)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, data: scanner })} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum scanner configurado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {`A mostrar ${paginatedScanners.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedScanners.length} de ${sortedAndFilteredScanners.length} scanners`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Adicionar Novo Scanner' : 'Editar Scanner'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Configurar um novo dispositivo de scanner.' : `Editar scanner: ${dialogState.data?.nome}`}
            </DialogDescription>
          </DialogHeader>
          <ScannerForm 
            scanner={dialogState.data} 
            onSave={handleSave} 
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogState.open} onOpenChange={() => setDeleteDialogState({ open: false, data: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá eliminar permanentemente o scanner <span className="font-bold">{deleteDialogState.data?.nome}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogState({ open: false, data: undefined })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
