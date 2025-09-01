
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Send, PackageSearch, ChevronsUpDown, ArrowUp, ArrowDown, Download } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import type { EnrichedBook } from "@/lib/data"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function ShipmentsClient() {
  const { books, handleMarkAsShipped } = useAppContext();
  const [selection, setSelection] = React.useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const { toast } = useToast();
  
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
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
  };
  
  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books
      .filter(book => book.status === 'Pending Shipment');
      
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

  const handleConfirmShipment = () => {
    if (selection.length > 0) {
      handleMarkAsShipped(selection);
      setSelection([]);
    }
    setIsConfirmOpen(false);
  }

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
    downloadFile(jsonString, 'shipment_export.json', 'application/json');
    toast({ title: "Exportação Concluída", description: `${data.length} livros exportados em formato JSON.` });
  }

  const exportCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'projectName', 'expectedDocuments', 'priority'];
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
    downloadFile(csvContent, 'shipment_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Exportação Concluída", description: `${data.length} livros exportados em formato CSV.` });
  }

  const exportXLSX = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const exportableData = data.map(({ id, name, projectName, expectedDocuments, priority }) => ({ id, name, projectName, expectedDocuments, priority }));
    const worksheet = XLSX.utils.json_to_sheet(exportableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipment");
    XLSX.writeFile(workbook, "shipment_export.xlsx");
    toast({ title: "Exportação Concluída", description: `${data.length} livros exportados em formato XLSX.` });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle className="font-headline">Preparar Envio</CardTitle>
                  <CardDescription>Selecione os livros que você está enviando para nós e marque-os como enviados.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-9 gap-1">
                            <Download className="h-3.5 w-3.5" />
                            <span>Exportar</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Exportar Seleção ({selection.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                    disabled={selection.length === 0}
                    onClick={() => setIsConfirmOpen(true)}
                >
                    <Send className="mr-2 h-4 w-4" />
                    Marcar {selection.length > 0 ? selection.length : ''} Livro(s) como Enviados
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                      <Checkbox
                          checked={sortedAndFilteredBooks.length > 0 && selection.length === sortedAndFilteredBooks.length}
                          onCheckedChange={(checked) => setSelection(checked ? sortedAndFilteredBooks.map(item => item.id) : [])}
                          aria-label="Selecionar todos"
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
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('expectedDocuments', e.shiftKey)}>
                      Páginas Esperadas {getSortIndicator('expectedDocuments')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('priority', e.shiftKey)}>
                      Prioridade {getSortIndicator('priority')}
                    </div>
                  </TableHead>
                </TableRow>
                <TableRow>
                    <TableHead />
                    <TableHead>
                        <Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead>
                        <Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead>
                         <Input placeholder="Filtrar páginas..." value={columnFilters['expectedDocuments'] || ''} onChange={(e) => handleColumnFilterChange('expectedDocuments', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Filtrar prioridade..." value={columnFilters['priority'] || ''} onChange={(e) => handleColumnFilterChange('priority', e.target.value)} className="h-8"/>
                        <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button>
                      </div>
                    </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredBooks.length > 0 ? (
                  sortedAndFilteredBooks.map((book, index) => (
                      <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                      <TableCell>
                          <Checkbox
                              checked={selection.includes(book.id)}
                              onCheckedChange={(checked) => setSelection(
                                  checked ? [...selection, book.id] : selection.filter((id) => id !== book.id)
                              )}
                              aria-label={`Selecionar linha ${index + 1}`}
                          />
                      </TableCell>
                      <TableCell className="font-medium">{book.name}</TableCell>
                      <TableCell>{book.projectName}</TableCell>
                      <TableCell className="text-center">{book.expectedDocuments}</TableCell>
                      <TableCell>{book.priority || "Medium"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <PackageSearch className="h-16 w-16 text-muted-foreground" />
                        <h3 className="text-xl font-semibold">Tudo Pronto!</h3>
                        <p>Não tem livros pendentes para enviar.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            {selection.length > 0 ? `${selection.length} livro(s) selecionado(s).` : `A mostrar ${sortedAndFilteredBooks.length} livro(s) pendente(s).`}
          </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
                <AlertDialogDescription>
                    Você está prestes a marcar {selection.length} livro(s) como enviados. Nossa equipe será notificada para esperar a chegada deles. Você tem certeza?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmShipment}>Confirmar e Enviar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
