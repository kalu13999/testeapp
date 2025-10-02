"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sliders, ArrowUp, ArrowDown, ChevronsUpDown, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type DocumentStatus, type EnrichedBook } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 100;

interface StatusOverrideClientProps {
    allStatuses: DocumentStatus[];
}

export default function StatusOverrideClient({ allStatuses }: StatusOverrideClientProps) {
  const { books, handleAdminStatusOverride } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });
  const [newStatus, setNewStatus] = React.useState('');
  const [reason, setReason] = React.useState('');
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

  const handleClearFilters = () => {
    setColumnFilters({});
    setCurrentPage(1);
  };

  /*const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof EnrichedBook];
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
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
  }, [books, columnFilters, sorting]);*/

  const [sortedAndFilteredBooks, setSortedAndFilteredBooks] = React.useState<EnrichedBook[]>([]);

  React.useEffect(() => {
    let filtered = books;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof EnrichedBook];
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        for (const s of sorting) {
          const key = s.id as keyof EnrichedBook;
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

    setSortedAndFilteredBooks(filtered);
  }, [books, columnFilters, sorting]);


  const selectedBooks = React.useMemo(() => {
    return sortedAndFilteredBooks.filter(book => selection.includes(book.id));
  }, [sortedAndFilteredBooks, selection]);

  React.useEffect(() => {
    setSelection([]);
  }, [columnFilters, sorting]);

  const totalPages = Math.ceil(sortedAndFilteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = sortedAndFilteredBooks.slice(
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

  const exportJSON = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'books_export.json', 'application/json');
    toast({ title: "Exportação Concluída", description: `${data.length} livros exportados em formato JSON.` });
  }

  const exportCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'status', 'priority', 'projectName', 'clientName', 'expectedDocuments', 'documentCount', 'progress', 'author', 'isbn', 'publicationYear', 'info'];
    const csvContent = [
        headers.join(','),
        ...data.map(book => 
            headers.map(header => {
                let value = book[header as keyof EnrichedBook] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, 'books_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Exportação Concluída", description: `${data.length} livros exportados em formato CSV.` });
  }

  const exportXLSX = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "books_export.xlsx");
    toast({ title: "Exportação Concluída", description: `${data.length} livros exportados em formato XLSX.` });
  }

  const copyToClipboardJSON = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        toast({ title: "Copiado para a Área de Transferência", description: `${data.length} livro(s) copiado(s) em formato JSON.` });
    }, () => {
        toast({ title: "Falha ao Copiar", description: "Não foi possível copiar para a área de transferência.", variant: "destructive" });
    });
  }

  const copyToClipboardCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'status', 'priority', 'projectName', 'clientName', 'expectedDocuments', 'documentCount', 'progress', 'author', 'isbn', 'publicationYear', 'info'];
    const csvContent = [
        headers.join(','),
        ...data.map(book => 
            headers.map(header => {
                let value = book[header as keyof EnrichedBook] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    navigator.clipboard.writeText(csvContent).then(() => {
        toast({ title: "Copiado para a Área de Transferência", description: `${data.length} livro(s) copiado(s) em formato CSV.` });
    }, () => {
        toast({ title: "Falha ao Copiar", description: "Não foi possível copiar para a área de transferência.", variant: "destructive" });
    });
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

  const openDialog = (book: EnrichedBook) => {
    setDialogState({ open: true, book });
    setNewStatus(book.status);
    setReason('');
  }

  const closeDialog = () => {
    setDialogState({ open: false, book: undefined })
    setNewStatus('');
    setReason('');
  }

  const handleSave = () => {
    if (dialogState.book && newStatus && reason) {
      handleAdminStatusOverride(dialogState.book.id, newStatus, reason);
      closeDialog();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Sobrescrever Estado</h1>
          <p className="text-muted-foreground">Altere manualmente o estado de qualquer livro no sistema. Requer atenção ao usar.</p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-9 gap-1">
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Exportar Seleção ({selection.length})</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Copy Selected ({selection.length})</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => copyToClipboardJSON(selectedBooks)} disabled={selection.length === 0}>Copiar como JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copyToClipboardCSV(selectedBooks)} disabled={selection.length === 0}>Copiar como CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Exportar Todos ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Exportar como XLSX</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Exportar como JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Exportar como CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Copy All ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => copyToClipboardJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Copiar como JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copyToClipboardCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Copiar como CSV</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[40px]">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      setSelection(checked ? paginatedBooks.map(b => b.id) : [])
                    }}
                    checked={paginatedBooks.length > 0 && paginatedBooks.every(b => selection.includes(b.id))}
                    aria-label="Select all on this page"
                  />
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                        Nome do Livro {getSortIndicator('name')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>
                        Projeto {getSortIndicator('projectName')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>
                        Estado Atual {getSortIndicator('status')}
                    </div>
                </TableHead>
                <TableHead className="w-[150px] text-right">Ações</TableHead>
              </TableRow>
              <TableRow>
                <TableHead />
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
                        placeholder="Filtrar projeto..."
                        value={columnFilters['projectName'] || ''}
                        onChange={(e) => handleColumnFilterChange('projectName', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                 <TableHead>
                    <Input
                        placeholder="Filtrar estado..."
                        value={columnFilters['status'] || ''}
                        onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length > 0 ? paginatedBooks.map((book) => (
                <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                  <TableCell>
                     <Checkbox
                      checked={selection.includes(book.id)}
                      onCheckedChange={(checked) => {
                        setSelection(
                          checked
                            ? [...selection, book.id]
                            : selection.filter((id) => id !== book.id)
                        )
                      }}
                      aria-label={`Select book ${book.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                     <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                  </TableCell>
                  <TableCell>{book.projectName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{book.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => openDialog(book)}>
                        <Sliders className="mr-2 h-4 w-4" />
                        Alterar Estado
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum livro encontrado correspondente aos filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
               {selection.length > 0 
                ? `${selection.length} de ${sortedAndFilteredBooks.length} livro(s) selecionado(s).` 
                : `A mostrar ${paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length} de ${sortedAndFilteredBooks.length} livros`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sobrescrever estado de: {dialogState.book?.name}</DialogTitle>
            <DialogDescription>
              Selecione um novo estado e forneça um motivo obrigatório para esta substituição. Esta ação será registrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="new-status">Novo Estado</Label>
                 <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="new-status">
                        <SelectValue placeholder="Selecione um novo estado" />
                    </SelectTrigger>
                    <SelectContent>
                        {allStatuses.map(status => (
                            <SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="reason">Motivo para a Alteração</Label>
                <Textarea 
                    id="reason"
                    placeholder="ex.: Erro de operador durante o QC."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!newStatus || !reason.trim() || newStatus === dialogState.book?.status}>
              Confirmar e Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
