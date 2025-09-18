
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
import { MoreHorizontal, PlusCircle, BookUp, Trash2, Edit, Info, FolderSearch, ChevronsUpDown, ArrowUp, ArrowDown, Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

import type { EnrichedBook, RawBook } from "@/lib/data"
import type { BookImport } from "@/context/workflow-context"
import { BookForm } from "./book-form"
import { useAppContext } from "@/context/workflow-context"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox";

const ITEMS_PER_PAGE = 100;

export default function BookManagementClient() {
  const { books, addBook, updateBook, deleteBook, importBooks, selectedProjectId } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'import' | 'details' | null; data?: EnrichedBook }>({ open: false, type: null })
  
  const [importJson, setImportJson] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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
    toast({ title: "Exportação Bem-Sucedida", description: `${data.length} livro(s) exportado(s) em formato JSON.` });
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
    toast({ title: "Exportação Bem-Sucedida", description: `${data.length} livro(s) exportado(s) em formato CSV.` });
  }

  const exportXLSX = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "books_export.xlsx");
    toast({ title: "Exportação Bem-Sucedida", description: `${data.length} livro(s) exportado(s) em formato XLSX.` });
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

  const openDialog = (type: 'new' | 'edit' | 'delete' | 'import' | 'details', data?: EnrichedBook) => {
    if ((type === 'new' || type === 'import') && !selectedProjectId) {
      toast({ title: "Nenhum Projeto Selecionado", description: "Por favor, selecione um projeto no filtro global do cabeçalho antes de adicionar ou importar livros.", variant: "destructive" });
      return;
    }
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
    setImportJson("");
  }

  const handleSave = (values: Omit<RawBook, 'id' | 'projectId' | 'statusId'>) => {
    if (dialogState.type === 'new' && selectedProjectId) {
      addBook(selectedProjectId, values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateBook(dialogState.data.id, values);
    }
    closeDialog()
  }
  
  const handleDelete = () => {
    if (!dialogState.data) return;
    deleteBook(dialogState.data.id);
    closeDialog()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                setImportJson(text);
            }
        };
        reader.readAsText(file);
    }
  };
  
  const handleImport = () => {
    if (!selectedProjectId) return;
    try {
        const parsedBooks: BookImport[] = JSON.parse(importJson);
        if (!Array.isArray(parsedBooks) || !parsedBooks.every(b => b.name && typeof b.expectedDocuments === 'number')) {
            throw new Error("Formato JSON inválido.");
        }
        importBooks(selectedProjectId, parsedBooks);
        closeDialog();
    } catch (error) {
        toast({ title: "Importação Falhou", description: "O texto fornecido não é JSON válido ou não corresponde ao formato exigido.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Gestão de Livros</h1>
          <p className="text-muted-foreground">Carregar e gerir a lista de livros para cada projeto.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openDialog('import')} disabled={!selectedProjectId}>
                <BookUp className="mr-2 h-4 w-4"/> Importar Lista de Livros (JSON)
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1" disabled={!selectedProjectId}>
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
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Livros</CardTitle>
              <CardDescription>
                {selectedProjectId ? "A mostrar livros para o projeto selecionado." : "Selecione um projeto na barra superior para gerir os seus livros."}
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => openDialog('new')} disabled={!selectedProjectId}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Livro
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[40px]">
                          <Checkbox
                              onCheckedChange={(checked) => setSelection(checked ? paginatedBooks.map(b => b.id) : [])}
                              checked={paginatedBooks.length > 0 && paginatedBooks.every(b => selection.includes(b.id))}
                              aria-label="Selecionar todos nesta página"
                              disabled={paginatedBooks.length === 0}
                          />
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                            Nome do Livro {getSortIndicator('name')}
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
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('expectedDocuments', e.shiftKey)}>
                            Páginas Previstas {getSortIndicator('expectedDocuments')}
                        </div>
                      </TableHead>
                      <TableHead><span className="sr-only">Ações</span></TableHead>
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
                                placeholder="Filtrar estado..."
                                value={columnFilters['status'] || ''}
                                onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filtrar prioridade..."
                                value={columnFilters['priority'] || ''}
                                onChange={(e) => handleColumnFilterChange('priority', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filtrar páginas..."
                                value={columnFilters['expectedDocuments'] || ''}
                                onChange={(e) => handleColumnFilterChange('expectedDocuments', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead />
                    </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProjectId ? (
                  paginatedBooks.length > 0 ? paginatedBooks.map(book => (
                      <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                          <TableCell>
                              <Checkbox
                                  checked={selection.includes(book.id)}
                                  onCheckedChange={(checked) => setSelection(checked ? [...selection, book.id] : selection.filter((id) => id !== book.id))}
                                  aria-label={`Selecionar livro ${book.name}`}
                              />
                          </TableCell>
                          <TableCell className="font-medium">{book.name}</TableCell>
                          <TableCell><Badge variant="outline">{book.status}</Badge></TableCell>
                          <TableCell>{book.priority || '—'}</TableCell>
                          <TableCell className="text-center">{book.expectedDocuments}</TableCell>
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
                                       <DropdownMenuItem onSelect={() => openDialog('details', book)}>
                                        <Info className="mr-2 h-4 w-4" /> Detalhes
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => openDialog('edit', book)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => openDialog('delete', book)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum livro encontrado para este projeto.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                       <div className="flex flex-col items-center gap-2">
                            <FolderSearch className="h-10 w-10 text-muted-foreground"/>
                            <span className="font-medium">Nenhum Projeto Selecionado</span>
                            <p className="text-muted-foreground">Por favor, use o filtro global no cabeçalho para selecionar um projeto.</p>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
           </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selection.length > 0 ? `${selection.length} de ${sortedAndFilteredBooks.length} livro(s) selecionado(s).` : `A mostrar ${paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length} de ${sortedAndFilteredBooks.length} livro(s)`}
          </div>
          <PaginationNav />
        </CardFooter>
      </Card>

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Adicionar Novo Livro' : 'Editar Livro'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Adicionar um novo livro ao projeto selecionado.' : `Editar livro: ${dialogState.data?.name}`}
            </DialogDescription>
          </DialogHeader>
          <BookForm book={dialogState.data} onSave={handleSave} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.open && dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente o livro <span className="font-bold">{dialogState.data?.name}</span> do manifesto do projeto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar Livro</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.open && dialogState.type === 'import'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Importar Livros de JSON</DialogTitle>
                <DialogDescription>
                    Faça upload ou cole um arquivo JSON com um array de livros.
                    Cada objeto deve ter um `name` (string) e `expectedDocuments` (número).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Carregar Ficheiro</Button>
                    <p className="text-sm text-muted-foreground">Ou cole o conteúdo abaixo.</p>
                    <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                </div>
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="json-input">Conteúdo JSON</Label>
                    <Textarea 
                        id="json-input"
                        placeholder='[{"name": "Book A", "expectedDocuments": 50}, {"name": "Book B", "expectedDocuments": 120}]'
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                        className="h-48 font-mono text-xs"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" onClick={handleImport} disabled={!importJson}>Importar Livros</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={dialogState.open && dialogState.type === 'details'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Livro</DialogTitle>
            <DialogDescription>{dialogState.data?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Autor</p>
              <p className="col-span-2 font-medium">{dialogState.data?.author || '—'}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">ISBN</p>
              <p className="col-span-2 font-medium">{dialogState.data?.isbn || '—'}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Ano de Publicação</p>
              <p className="col-span-2 font-medium">{dialogState.data?.publicationYear || '—'}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Prioridade</p>
              <p className="col-span-2 font-medium">{dialogState.data?.priority || '—'}</p>
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
