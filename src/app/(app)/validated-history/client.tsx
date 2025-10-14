

"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppContext } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CheckCircle2, XCircle, History, ArrowUp, ArrowDown, ChevronsUpDown, Download, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type EnrichedBook } from "@/lib/data";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";


const ITEMS_PER_PAGE = 50;

type ValidatedBook = EnrichedBook & { 
  validationDate: string; 
  validationStatus: 'Approved' | 'Rejected';
  deliveryBatchInfo?: { id: string; creationDate: string };
  validatorName?: string;
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-center gap-x-4">
    <p className="text-muted-foreground">{label}</p>
    <div className="col-span-2 font-medium">{value}</div>
  </div>
);

export default function ValidatedHistoryClient() {
    const { books, auditLogs, currentUser, deliveryBatches, deliveryBatchItems, users } = useAppContext();
    const { toast } = useToast();

    const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
    const [currentPage, setCurrentPage] = React.useState(1);
    const [selection, setSelection] = React.useState<string[]>([]);
    const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
        { id: 'validationDate', desc: true }
    ]);
    const [detailsState, setDetailsState] = React.useState<{ open: boolean; book?: ValidatedBook }>({ open: false });

    const handleColumnFilterChange = (columnId: string, value: string) => {
        setColumnFilters(prev => ({ ...prev, [columnId]: value }));
        setCurrentPage(1);
    };

    const handleSort = (columnId: string, isShift: boolean) => {
        setSorting(currentSorting => {
            if (isShift) {
                const newSorting = [...currentSorting];
                const existingSortIndex = newSorting.findIndex(s => s.id === columnId);
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
            } 
            
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) {
                    return [];
                } else {
                    return [{ id: columnId, desc: true }];
                }
            } 
            
            return [{ id: columnId, desc: false }];
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

    const validationHistory: ValidatedBook[] = React.useMemo(() => {
      if (!currentUser) return [];

      let relevantBooks = books.filter(book => ['Complete', 'Finalized', 'Client Rejected'].includes(book.status));
      
      // If user is a client (but not admin), filter by their client ID
      if (currentUser.clientId) {
          relevantBooks = relevantBooks.filter(book => book.clientId === currentUser.clientId);
      }

      return relevantBooks.map(book => {
          const deliveryItem = deliveryBatchItems.find(item => item.bookId === book.id);
          const validationLog = auditLogs.find(log =>
              log.bookId === book.id && (log.action === 'Client Approval' || log.action === 'Client Rejection')
          );
          const deliveryBatch = deliveryItem ? deliveryBatches.find(batch => batch.id === deliveryItem.deliveryId) : undefined;
          
          let validatorName = 'System';
          let validationDate = validationLog?.date || 'N/A';
          
          if (deliveryItem && deliveryItem.user_id) {
              const validator = users.find(u => u.id === deliveryItem.user_id);
              validatorName = validator?.name || 'Unknown User';
          }
           // Fallback to audit log user if item doesn't have it (e.g. bulk actions)
          else if (validationLog && validationLog.userId) {
              const validator = users.find(u => u.id === validationLog.userId);
              validatorName = validator?.name || 'System';
          }


          return {
              ...book,
              validationDate,
              validationStatus: book.status === 'Client Rejected' ? 'Rejected' : 'Approved',
              deliveryBatchInfo: deliveryBatch ? { id: deliveryBatch.id, creationDate: deliveryBatch.creationDate } : undefined,
              validatorName,
          };
      });
    }, [books, auditLogs, currentUser, deliveryBatches, deliveryBatchItems, users]);


    const sortedAndFilteredHistory = React.useMemo(() => {
        let filtered = validationHistory;
        
        Object.entries(columnFilters).forEach(([columnId, value]) => {
            if (value) {
                filtered = filtered.filter(item => {
                    const itemValue = item[columnId as keyof ValidatedBook];
                    return String(itemValue).toLowerCase().includes(value.toLowerCase());
                });
            }
        });

        if (sorting.length > 0) {
            filtered.sort((a, b) => {
                for (const s of sorting) {
                    const key = s.id as keyof typeof filtered[0];
                    const valA = a[key];
                    const valB = b[key];

                    let result = 0;
                    if (key === 'deliveryBatchInfo') {
                        const dateA = a.deliveryBatchInfo ? new Date(a.deliveryBatchInfo.creationDate).getTime() : 0;
                        const dateB = b.deliveryBatchInfo ? new Date(b.deliveryBatchInfo.creationDate).getTime() : 0;
                        result = dateA - dateB;
                    }
                    else if (valA === null || valA === undefined || valA === 'N/A') result = -1;
                    else if (valB === null || valB === undefined || valB === 'N/A') result = 1;
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
    }, [validationHistory, columnFilters, sorting]);
    
    const selectedHistory = React.useMemo(() => {
        return sortedAndFilteredHistory.filter(item => selection.includes(item.id));
    }, [sortedAndFilteredHistory, selection]);

    React.useEffect(() => {
        setSelection([]);
    }, [columnFilters, sorting]);


    const totalPages = Math.ceil(sortedAndFilteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = sortedAndFilteredHistory.slice(
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

    const exportJSON = (data: ValidatedBook[]) => {
        if (data.length === 0) return;
        const jsonString = JSON.stringify(data, null, 2);
        downloadFile(jsonString, 'history_export.json', 'application/json');
        toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato JSON.` });
    }

    const exportCSV = (data: ValidatedBook[]) => {
        if (data.length === 0) return;
        const headers = ['id', 'name', 'projectName', 'validationStatus', 'validationDate', 'rejectionReason', 'validatorName'];
        const csvContent = [
            headers.join(','),
            ...data.map(item => 
                headers.map(header => {
                    let value = item[header as keyof ValidatedBook] ?? '';
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        downloadFile(csvContent, 'history_export.csv', 'text/csv;charset=utf-8;');
        toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato CSV.` });
    }

    const exportXLSX = (data: ValidatedBook[]) => {
        if (data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Validated History");
        XLSX.writeFile(workbook, "history_export.xlsx");
        toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato XLSX.` });
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

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Histórico de Validações</CardTitle>
                            <CardDescription>Histórico de todos os lotes de documentos aprovados e rejeitados.</CardDescription>
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
                                <DropdownMenuItem onSelect={() => exportXLSX(selectedHistory)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => exportJSON(selectedHistory)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => exportCSV(selectedHistory)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Exportar Todos ({sortedAndFilteredHistory.length})</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredHistory)} disabled={sortedAndFilteredHistory.length === 0}>Exportar como XLSX</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredHistory)} disabled={sortedAndFilteredHistory.length === 0}>Exportar como JSON</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredHistory)} disabled={sortedAndFilteredHistory.length === 0}>Exportar como CSV</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        onCheckedChange={(checked) => setSelection(checked ? paginatedHistory.map(h => h.id) : [])}
                                        checked={paginatedHistory.length > 0 && paginatedHistory.every(h => selection.includes(h.id))}
                                        aria-label="Selecionar todos nesta página"
                                    />
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                                        Nome do Lote {getSortIndicator('name')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('deliveryBatchInfo', e.shiftKey)}>
                                        Lote de Entrega {getSortIndicator('deliveryBatchInfo')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>
                                        Projeto {getSortIndicator('projectName')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('validationStatus', e.shiftKey)}>
                                        Resultado {getSortIndicator('validationStatus')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('validatorName', e.shiftKey)}>
                                        Validador {getSortIndicator('validatorName')}
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('validationDate', e.shiftKey)}>
                                        Data {getSortIndicator('validationDate')}
                                    </div>
                                </TableHead>
                                <TableHead className="w-[80px] text-center">Razão</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead/>
                                <TableHead>
                                    <Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/>
                                </TableHead>
                                 <TableHead>
                                    <Input placeholder="Filter batch..." value={columnFilters['deliveryBatchInfo'] || ''} onChange={(e) => handleColumnFilterChange('deliveryBatchInfo', e.target.value)} className="h-8"/>
                                </TableHead>
                                <TableHead>
                                    <Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/>
                                </TableHead>
                                <TableHead>
                                    <Input placeholder="Filter outcome..." value={columnFilters['validationStatus'] || ''} onChange={(e) => handleColumnFilterChange('validationStatus', e.target.value)} className="h-8"/>
                                </TableHead>
                                 <TableHead>
                                    <Input placeholder="Filter validator..." value={columnFilters['validatorName'] || ''} onChange={(e) => handleColumnFilterChange('validatorName', e.target.value)} className="h-8"/>
                                </TableHead>
                                <TableHead>
                                    <Input placeholder="Filtrar data..." value={columnFilters['validationDate'] || ''} onChange={(e) => handleColumnFilterChange('validationDate', e.target.value)} className="h-8"/>
                                </TableHead>
                                <TableHead colSpan={2} className="text-right">
                                    <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedHistory.length > 0 ? (
                                paginatedHistory.map(book => (
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
                                            aria-label={`Selecionar item ${book.name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                        </TableCell>
                                        <TableCell>
                                          {book.deliveryBatchInfo ? new Date(book.deliveryBatchInfo.creationDate).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>{book.projectName}</TableCell>
                                        <TableCell>
                                            {book.validationStatus === 'Approved' ? (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">
                                                    <CheckCircle2 className="mr-2 h-4 w-4"/>
                                                    Aprovado
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <XCircle className="mr-2 h-4 w-4"/>
                                                    Rejeitado
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{book.validatorName}</TableCell>
                                        <TableCell>{book.validationDate !== 'N/A' ? new Date(book.validationDate).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell className="text-center">
                                            {book.rejectionReason ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Info className="h-5 w-5 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-sm">{book.rejectionReason}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : '—'}
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
                                                    <DropdownMenuItem onSelect={() => setDetailsState({ open: true, book })}>
                                                        <Info className="mr-2 h-4 w-4" /> Detalhes
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                            <TableRow><TableCell colSpan={9} className="h-24 text-center">
                                    Nenhum histórico de validações encontrado correspondente aos filtros.
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                    {selection.length > 0 ? `${selection.length} de ${sortedAndFilteredHistory.length} item(s) selecionados.` : `A mostrar ${paginatedHistory.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedHistory.length} de ${sortedAndFilteredHistory.length} lotes validados`}
                    </div>
                    {totalPages > 1 && <PaginationNav />}
                </CardFooter>
            </Card>

            <Dialog open={detailsState.open} onOpenChange={(open) => !open && setDetailsState({ open: false, book: undefined })}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detalhes do Livro</DialogTitle>
                    <DialogDescription>{detailsState.book?.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-sm">
                    <DetailItem label="Projeto" value={detailsState.book?.projectName} />
                    <Separator />
                    <DetailItem label="Autor" value={detailsState.book?.author || '—'} />
                    <DetailItem label="ISBN" value={detailsState.book?.isbn || '—'} />
                    <DetailItem label="Ano de Publicação" value={detailsState.book?.publicationYear || '—'} />
                    <Separator />
                    <DetailItem label="Prioridade" value={detailsState.book?.priority || '—'} />
                    <DetailItem label="Resultado" value={detailsState.book?.validationStatus} />
                    <DetailItem label="Validador" value={detailsState.book?.validatorName || 'N/A'} />
                    <DetailItem label="Validado Em" value={detailsState.book?.validationDate ? format(new Date(detailsState.book.validationDate), "PPP") : 'N/A'} />
                    {detailsState.book?.info && (
                    <>
                    <Separator />
                    <div className="pt-2 grid grid-cols-1 gap-2">
                        <p className="text-muted-foreground">Informações Adicionais</p>
                        <p className="font-medium whitespace-pre-wrap">{detailsState.book.info}</p>
                    </div>
                    </>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setDetailsState({ open: false, book: undefined })}>Fechar</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
