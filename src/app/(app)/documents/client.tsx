

"use client"

import * as React from "react";
import Link from "next/link";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowUp, ArrowDown, ChevronsUpDown,  MessageSquarePlus, MoreHorizontal, Info, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/workflow-context";
import type { EnrichedBook } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 50;

export default function DocumentsClient() {
  const { books, getRelevantObservations, addBookObservation } = useAppContext();
  const { toast } = useToast();
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);

  const [detailsState, setDetailsState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });

  const [newObservation, setNewObservation] = React.useState('');
  const [observationTarget, setObservationTarget] = React.useState<EnrichedBook | null>(null);



  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-3 items-center gap-x-4">
      <p className="text-muted-foreground">{label}</p>
      <p className="col-span-2 font-medium">{value}</p>
    </div>
  );


  const relevantObservations = React.useMemo(
    () => {
      if (!detailsState.book?.id) return [];
      return getRelevantObservations(detailsState.book.id);
    },
    [detailsState.book?.id]
  );

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
  
  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof EnrichedBook] ?? (columnId === 'priority' ? 'Medium' : '');
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
                const valA = a[key] ?? (key === 'priority' ? 'Medium' : '');
                const valB = b[key] ?? (key === 'priority' ? 'Medium' : '');

                let result = 0;
                if (key === 'priority') {
                    const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
                    result = order[valA as 'High' | 'Medium' | 'Low'] - order[valB as 'High' | 'Medium' | 'Low'];
                } else if (typeof valA === 'number' && typeof valB === 'number') {
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
    const headers = ['id', 'name', 'status', 'priority', 'projectName', 'clientName', 'expectedDocuments', 'documentCount', 'progress', 'author', 'isbn', 'publicationYear', 'info', 'storageName', 'scannerDeviceName'];
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
    const headers = ['id', 'name', 'status', 'priority', 'projectName', 'clientName', 'expectedDocuments', 'documentCount', 'progress', 'author', 'isbn', 'publicationYear', 'info', 'storageName', 'scannerDeviceName'];
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
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) {
            pageNumbers.push(-1); // Ellipsis
        }

        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 2) {
            end = 3;
        }
        if (currentPage >= totalPages - 1) {
            start = totalPages - 2;
        }

        for (let i = start; i <= end; i++) {
            pageNumbers.push(i);
        }
        
        if (currentPage < totalPages - 2) {
            pageNumbers.push(-1); // Ellipsis
        }
        pageNumbers.push(totalPages);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} 
              className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {pageNumbers.map((num, index) => (
             num === -1 ? (
                <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                </PaginationItem>
             ) : (
                <PaginationItem key={num}>
                    <PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>
                        {num}
                    </PaginationLink>
                </PaginationItem>
             )
          ))}
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Todos os Livros</h1>
          <p className="text-muted-foreground">Gestão e acompanhamento de todos os livros no fluxo de trabalho.</p>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Exportar
                    </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Exportar Selecionados ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Copiar Selecionados ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => copyToClipboardJSON(selectedBooks)} disabled={selection.length === 0}>
                      Copiar como JSON
                   </DropdownMenuItem>
                   <DropdownMenuItem onSelect={() => copyToClipboardCSV(selectedBooks)} disabled={selection.length === 0}>
                      Copiar como CSV
                   </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Exportar Todos ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Exportar como XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Exportar como JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>Exportar como CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Copiar Todos ({sortedAndFilteredBooks.length})</DropdownMenuLabel>
                   <DropdownMenuItem onSelect={() => copyToClipboardJSON(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Copiar como JSON
                   </DropdownMenuItem>
                   <DropdownMenuItem onSelect={() => copyToClipboardCSV(sortedAndFilteredBooks)} disabled={sortedAndFilteredBooks.length === 0}>
                      Copiar como CSV
                   </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
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
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('clientName', e.shiftKey)}>
                        Cliente {getSortIndicator('clientName')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('scannerDeviceName', e.shiftKey)}>
                        Scanner {getSortIndicator('scannerDeviceName')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('storageName', e.shiftKey)}>
                        Armazenamento {getSortIndicator('storageName')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>
                        Estado {getSortIndicator('status')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('priority', e.shiftKey)}>
                        Prioridade {getSortIndicator('priority')}
                    </div>
                </TableHead>
                <TableHead className="w-[150px]">Progresso</TableHead>
                <TableHead className="text-center w-[120px]">
                     <div className="flex items-center gap-2 cursor-pointer select-none group justify-center" onClick={(e) => handleSort('documentCount', e.shiftKey)}>
                        Páginas {getSortIndicator('documentCount')}
                    </div>
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead/>
                <TableHead>
                    <Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filtrar cliente..." value={columnFilters['clientName'] || ''} onChange={(e) => handleColumnFilterChange('clientName', e.target.value)} className="h-8"/>
                </TableHead>
                 <TableHead>
                    <Input placeholder="Filtrar scanner..." value={columnFilters['scannerDeviceName'] || ''} onChange={(e) => handleColumnFilterChange('scannerDeviceName', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filtrar armazenamento..." value={columnFilters['storageName'] || ''} onChange={(e) => handleColumnFilterChange('storageName', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead>
                    <Input placeholder="Filtrar prioridade..." value={columnFilters['priority'] || ''} onChange={(e) => handleColumnFilterChange('priority', e.target.value)} className="h-8"/>
                </TableHead>
                <TableHead/>
                <TableHead/>
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
                      aria-label={`Selecionar livro ${book.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/books/${book.id}`} className="hover:underline">
                      {book.name}
                    </Link>
                  </TableCell>
                  <TableCell>{book.projectName}</TableCell>
                  <TableCell>{book.clientName}</TableCell>
                  <TableCell>{book.scannerDeviceName || '—'}</TableCell>
                  <TableCell>{book.storageName || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={book.status === 'Complete' ? "default" : "outline"}>{book.status}</Badge>
                  </TableCell>
                   <TableCell>{book.priority || "Medium"}</TableCell>
                  <TableCell>
                      <Progress value={book.progress} className="h-2" />
                  </TableCell>
                  <TableCell className="text-center">{book.documentCount} / {book.expectedDocuments}</TableCell>
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
                            <DropdownMenuItem onSelect={() => setObservationTarget(book)}>
                                <MessageSquarePlus className="mr-2 h-4 w-4" />
                                Observação
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setDetailsState({ open: true, book: book })}>
                                <Info className="mr-2 h-4 w-4" />
                                Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    Nenhum livro encontrado que corresponda aos seus filtros.
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
            : `A mostrar ${paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length} de ${sortedAndFilteredBooks.length} livro(s)`}
          </div>
           <PaginationNav />
        </CardFooter>
      </Card>

      
          <Dialog open={!!observationTarget} onOpenChange={() => setObservationTarget(null)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Adicionar Observação para: {observationTarget?.name}</DialogTitle>
                      <DialogDescription>
                          A sua nota será adicionada ao histórico do livro com o seu nome e data.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                      <Textarea
                          placeholder="Escreva a sua observação aqui..."
                          value={newObservation}
                          onChange={(e) => setNewObservation(e.target.value)}
                          rows={5}
                      />
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setObservationTarget(null)}>Cancelar</Button>
                      <Button onClick={() => {
                          if (observationTarget) addBookObservation(observationTarget.id, newObservation);
                          setNewObservation('');
                          setObservationTarget(null);
                      }} disabled={!newObservation.trim()}>Guardar Observação</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      
          <Dialog
            open={detailsState.open}
            onOpenChange={() => setDetailsState({ open: false, book: undefined })}
          >
            <DialogContent className="max-w-2xl w-full p-6 rounded-2xl shadow-lg bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Detalhes do Livro 
                <p></p>
                <Link href={`/books/${detailsState.book?.id}`} className="text-primary hover:underline">
                      {detailsState.book?.name}</Link>
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                {detailsState.book?.clientName} - {detailsState.book?.projectName}
              </DialogDescription>
            </DialogHeader>
      
              {/* Detalhes do livro - linha vertical, tipografia leve */}
              <div className="space-y-2 mb-8 text-sm text-gray-700">
      
                      <DetailItem label="Título" value={detailsState.book?.author || '—'} />
                      <DetailItem label="Cota" value={detailsState.book?.isbn || '—'} />
                      <DetailItem label="NCB" value={detailsState.book?.publicationYear || '—'} />
                      <Separator />
                      <DetailItem label="Prioridade" value={detailsState.book?.priority || '—'} />
                      <Separator />
                      <DetailItem label="Scanner" value={detailsState.book?.scannerDeviceName || '—'} />
                      <DetailItem label="Armazenamento" value={detailsState.book?.storageName || '—'} />
                      
                      {detailsState.book?.info && (
                      <>
                      <Separator />
                      <div className="pt-2 grid grid-cols-1 gap-2">
                          <p className="text-muted-foreground">Informação Adicional</p>
                          <p className="font-medium whitespace-pre-wrap">{detailsState.book?.info}</p>
                      </div>
                      </>
                      )}
      
              </div>
      
              {/* Histórico de Observações */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-gray-500" /> Histórico de Observações
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto text-sm text-gray-700">
                  {relevantObservations.length > 0 ? (
                    relevantObservations.map((obs) => (
                      <div key={obs.id} className="p-2 border border-gray-100 rounded-lg bg-gray-50">
                        <p>{obs.observation}</p>
                        <time className="text-xs text-gray-500 mt-1 block">
                          {new Date(obs.created_at).toLocaleString()} por {obs.userName}
                        </time>
                      </div>
                    ))
                  ) : (
                    <p>Nenhuma observação registada.</p>
                  )}
                </div>
              </section>
      
              {/* Footer */}
              <DialogFooter className="mt-6 flex justify-end">
      
              </DialogFooter>
            </DialogContent>
          </Dialog>
    </div>
  )
}
