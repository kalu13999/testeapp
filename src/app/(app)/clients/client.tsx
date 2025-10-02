
"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Info, ArrowUp, ArrowDown, ChevronsUpDown, Download } from "lucide-react"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { type Client } from "@/lib/data"
import { ClientForm } from "./client-form"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";


const ITEMS_PER_PAGE = 100;

export default function ClientsClient() {
  const { clients, addClient, updateClient, deleteClient } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'details' | null; data?: Client }>({ open: false, type: null })
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

  /*const sortedAndFilteredClients = React.useMemo(() => {
    let filtered = clients;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
        if (value) {
            filtered = filtered.filter(client => {
                const clientValue = client[columnId as keyof Client];
                return String(clientValue).toLowerCase().includes(value.toLowerCase());
            });
        }
    });

     if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof Client;
                const valA = a[key];
                const valB = b[key];

                let result = 0;
                if (valA === null || valA === undefined) result = -1;
                else if (valB === null || valB === undefined) result = 1;
                else if (typeof valA === 'number' && typeof valB === 'number') {
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

  }, [clients, columnFilters, sorting]);*/


  const [sortedAndFilteredClients, setSortedAndFilteredClients] = React.useState<Client[]>([]);

  React.useEffect(() => {
    let filtered = clients;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(client => {
          const clientValue = client[columnId as keyof Client];
          return String(clientValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        for (const s of sorting) {
          const key = s.id as keyof Client;
          const valA = a[key];
          const valB = b[key];

          let result = 0;
          if (valA === null || valA === undefined) result = -1;
          else if (valB === null || valB === undefined) result = 1;
          else if (typeof valA === 'number' && typeof valB === 'number') {
            result = valA - valB;
          } else {
            result = String(valA).localeCompare(String(valB), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          }

          if (result !== 0) {
            return s.desc ? -result : result;
          }
        }
        return 0;
      });
    }

    setSortedAndFilteredClients(filtered);
  }, [clients, columnFilters, sorting]);

  
  const selectedClients = React.useMemo(() => {
    return sortedAndFilteredClients.filter(client => selection.includes(client.id));
  }, [sortedAndFilteredClients, selection]);

  React.useEffect(() => {
    setSelection([]);
  }, [columnFilters, sorting]);


  const totalPages = Math.ceil(sortedAndFilteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = sortedAndFilteredClients.slice(
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

  const exportJSON = (data: Client[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'clients_export.json', 'application/json');
    toast({ title: "Exportação Concluída", description: `${data.length} clientes exportados em formato JSON.` });
  }

  const exportCSV = (data: Client[]) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(client => 
            headers.map(header => {
                let value = client[header as keyof Client] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, 'clients_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Exportação Concluída", description: `${data.length} clientes exportados em formato CSV.` });
  }

  const exportXLSX = (data: Client[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients_export.xlsx");
    toast({ title: "Exportação Concluída", description: `${data.length} clientes exportados em formato XLSX.` });
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

  const openDialog = (type: 'new' | 'edit' | 'delete' | 'details', data?: Client) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
  }

  const handleSave = (values: Omit<Client, 'id'>) => {
    if (dialogState.type === 'new') {
      addClient(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateClient(dialogState.data.id, values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!dialogState.data) return;
    deleteClient(dialogState.data.id);
    closeDialog()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerir todos os clientes da empresa.</p>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Exportar Seleção ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(selectedClients)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(selectedClients)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(selectedClients)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Exportar Todos ({sortedAndFilteredClients.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredClients)} disabled={sortedAndFilteredClients.length === 0}>Exportar como XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredClients)} disabled={sortedAndFilteredClients.length === 0}>Exportar como JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredClients)} disabled={sortedAndFilteredClients.length === 0}>Exportar como CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => openDialog('new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
               Novo Cliente
            </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                    <Checkbox
                        onCheckedChange={(checked) => setSelection(checked ? paginatedClients.map(c => c.id) : [])}
                        checked={paginatedClients.length > 0 && paginatedClients.every(c => selection.includes(c.id))}
                        aria-label="Select all on this page"
                    />
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                        Nome do Cliente {getSortIndicator('name')}
                    </div>
                </TableHead>
                <TableHead>
                     <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('contactEmail', e.shiftKey)}>
                        Email de Contato {getSortIndicator('contactEmail')}
                    </div>
                </TableHead>
                <TableHead>
                     <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('contactPhone', e.shiftKey)}>
                        Telefone {getSortIndicator('contactPhone')}
                    </div>
                </TableHead>
                <TableHead>
                     <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('since', e.shiftKey)}>
                        Cliente Desde {getSortIndicator('since')}
                    </div>
                </TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
              <TableRow>
                    <TableHead/>
                    <TableHead>
                        <Input
                            placeholder="Filtrar nome..."
                            value={columnFilters['name'] || ''}
                            onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead>
                        <Input
                            placeholder="Filtrar e-mail..."
                            value={columnFilters['contactEmail'] || ''}
                            onChange={(e) => handleColumnFilterChange('contactEmail', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead>
                        <Input
                            placeholder="Filtrar telefone..."
                            value={columnFilters['contactPhone'] || ''}
                            onChange={(e) => handleColumnFilterChange('contactPhone', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead>
                        <Input
                            placeholder="Filtrar data..."
                            value={columnFilters['since'] || ''}
                            onChange={(e) => handleColumnFilterChange('since', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead/>
                </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.length > 0 ? paginatedClients.map((client) => (
                <TableRow key={client.id} data-state={selection.includes(client.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selection.includes(client.id)}
                      onCheckedChange={(checked) => {
                        setSelection(
                          checked
                            ? [...selection, client.id]
                            : selection.filter((id) => id !== client.id)
                        )
                      }}
                      aria-label={`Select client ${client.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contactEmail}</TableCell>
                  <TableCell>{client.contactPhone}</TableCell>
                  <TableCell>{format(new Date(client.since), "yyyy-MM-dd")}</TableCell>
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
                        <DropdownMenuItem onSelect={() => openDialog('details', client)}>
                           <Info className="mr-2 h-4 w-4" /> Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openDialog('edit', client)}>
                           <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openDialog('delete', client)} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum cliente encontrado correspondente à sua pesquisa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
               {selection.length > 0 ? `${selection.length} de ${sortedAndFilteredClients.length} cliente(s) selecionado(s).` : `A mostrar ${paginatedClients.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedClients.length} de ${sortedAndFilteredClients.length} clientes`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Criar Novo Cliente' : 'Editar Cliente'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Adicionar um novo cliente ao sistema.' : `Editar cliente: ${dialogState.data?.name}`}
            </DialogDescription>
          </DialogHeader>
          <ClientForm client={dialogState.data} onSave={handleSave} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.open && dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá eliminar permanentemente o cliente <span className="font-bold">{dialogState.data?.name}</span> e todos os seus projetos e livros associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.open && dialogState.type === 'details'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>{dialogState.data?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Email de Contato</p>
              <p className="col-span-2 font-medium">{dialogState.data?.contactEmail}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Telefone de Contato</p>
              <p className="col-span-2 font-medium">{dialogState.data?.contactPhone}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Website</p>
              <a href={dialogState.data?.website} target="_blank" rel="noopener noreferrer" className="col-span-2 font-medium text-primary hover:underline">{dialogState.data?.website}</a>
            </div>
            <div className="grid grid-cols-3 items-start gap-x-4">
              <p className="text-muted-foreground">Morada</p>
              <p className="col-span-2 font-medium">{dialogState.data?.address}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Cliente Desde</p>
              <p className="col-span-2 font-medium">{dialogState.data?.since ? format(new Date(dialogState.data.since), "yyyy-MM-dd") : '—'}</p>
            </div>
            {dialogState.data?.info && (
              <div className="grid grid-cols-3 items-start gap-x-4">
                <p className="text-muted-foreground">Informação Adicional</p>
                <p className="col-span-2 font-medium whitespace-pre-wrap">{dialogState.data.info}</p>
              </div>
            )}
          </div>
           <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeDialog}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
