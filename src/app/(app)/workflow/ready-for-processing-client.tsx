

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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PlusCircle, X, ListPlus, PlayCircle, BookOpen, ChevronsUpDown, ArrowUp, ArrowDown, CheckSquare, AlertCircle, Warehouse, BarChart, ListOrdered, Database, FileText } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppContext } from "@/context/workflow-context"
import type { EnrichedBook } from "@/lib/data"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ReadyForProcessingClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStatus?: string;
  };
}

const KpiCard = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default function ReadyForProcessingClient({ config }: ReadyForProcessingClientProps) {
  const { books, startProcessingBatch, selectedProjectId, storages } = useAppContext();
  const [selectionByStorage, setSelectionByStorage] = React.useState<Record<string, string[]>>({});
  const [multiSelection, setMultiSelection] = React.useState<string[]>([]);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  const [selectedStorageId, setSelectedStorageId] = React.useState<string | null>(null);
  
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [isBatchPanelOpen, setIsBatchPanelOpen] = React.useState(true);


  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
  };

  const handleClearFilters = () => {
    setColumnFilters({});
  };
  
  const handleSort = (columnId: string) => {
    setSorting(currentSorting => {
      if (currentSorting.length > 0 && currentSorting[0].id === columnId) {
        return [{ id: columnId, desc: !currentSorting[0].desc }];
      }
      return [{ id: columnId, desc: false }];
    });
  };
  
  const getSortIndicator = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
  };

  const availableBooks = React.useMemo(() => {
    let baseBooks = books.filter(book => book.status === config.dataStatus);
    
    if (selectedStorageId && selectedStorageId !== 'all') {
        const selectedStorage = storages.find(s => s.id === Number(selectedStorageId));
        if (selectedStorage) {
            baseBooks = baseBooks.filter(book => book.storageName === selectedStorage.nome);
        } else {
            return []; // Nenhum storage válido selecionado
        }
    }
    
    if (selectedProjectId) {
      baseBooks = baseBooks.filter(book => book.projectId === selectedProjectId);
    }
    
    let filtered = baseBooks;
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
            const s = sorting[0];
            const valA = a[s.id as keyof EnrichedBook];
            const valB = b[s.id as keyof EnrichedBook];

            let result = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
                result = valA - valB;
            } else {
                result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            }
            if (result !== 0) {
                return s.desc ? -result : result;
            }
            return 0;
        });
    }

    return filtered;
  }, [books, config.dataStatus, selectedProjectId, columnFilters, sorting, selectedStorageId, storages]);
 

  const selection = React.useMemo(() => {
    if (!selectedStorageId || selectedStorageId === "all") {
      // Quando todos, não pré-seleciona nada
      return [];
    }
    return selectionByStorage[selectedStorageId] || [];
  }, [selectionByStorage, selectedStorageId]);

    React.useEffect(() => {
      if (storages.length > 0 && (selectedStorageId === null || selectedStorageId === "all")) {
        setSelectedStorageId(null); // Todos
      }
    }, [storages, selectedStorageId]);

    React.useEffect(() => {
      setMultiSelection([]);
    }, [selectedStorageId]);

  const selectedBooksInfo = React.useMemo(() => {
      return selection.map(id => books.find(b => b.id === id)).filter((b): b is EnrichedBook => !!b);
  }, [selection, books]);

  const totalSelectedPages = React.useMemo(() => {
    return selectedBooksInfo.reduce((sum, book) => sum + book.expectedDocuments, 0);
  }, [selectedBooksInfo]);
  
  const toggleSelection = (bookId: string) => {
    if (!selectedStorageId) return;
    setSelectionByStorage(prev => {
        const currentSelection = prev[selectedStorageId] || [];
        const newSelection = currentSelection.includes(bookId)
            ? currentSelection.filter(id => id !== bookId)
            : Array.from(new Set([...currentSelection, bookId])); // <-- garante unicidade
        return { ...prev, [selectedStorageId]: newSelection };
    });
  }

  const handleStartProcess = () => {
    if (!selectedStorageId) return;
    startProcessingBatch(selection, selectedStorageId);
    setSelectionByStorage(prev => ({ ...prev, [selectedStorageId]: [] }));
    setMultiSelection([]);
  }

  const handleAddMultiple = () => {
    if (!selectedStorageId) return;
    setSelectionByStorage(prev => {
        const currentSelection = prev[selectedStorageId] || [];
        const newSelection = Array.from(new Set([...currentSelection, ...multiSelection])); // <-- garante unicidade
        return { ...prev, [selectedStorageId]: newSelection };
    });
    setMultiSelection([]);
  }

  const toggleAllMultiSelection = () => {
    if (!selectedStorageId || selectedStorageId === "all") return;
    const availableForMulti = availableBooks.filter(b => !selection.includes(b.id));
    if (multiSelection.length === availableForMulti.length) {
      setMultiSelection([]);
    } else {
      setMultiSelection(availableForMulti.map(b => b.id));
    }
  }
  
  const clearSelectionForCurrentStorage = () => {
    if (!selectedStorageId) return;
    setSelectionByStorage(prev => ({ ...prev, [selectedStorageId]: [] }));
  };

  const availableForMultiSelectCount = availableBooks.filter(b => !selection.includes(b.id)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className={cn("transition-all duration-300", isBatchPanelOpen ? "lg:col-span-2" : "lg:col-span-3")}>
          <Card>
            <CardHeader>
              {/* Título e botões */}
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{config.title}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsBatchPanelOpen((p) => !p)}>
                    Batch Panel
                    <Badge variant="destructive" className="ml-2">
                      {selection.length}
                    </Badge>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={multiSelection.length === 0}
                    onClick={handleAddMultiple}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add to Batch
                  </Button>
                </div>
              </div> {/* <-- FECHOU AQUI CORRETAMENTE */}

              {/* Tabela de seleção de Storage */}
              <div className="pt-4">
                <Accordion type="single" collapsible className="w-full pt-2 mb-6">
                  <AccordionItem value="storage-selection">
                    <AccordionTrigger className="text-base px-6 font-semibold rounded-lg border bg-card text-card-foreground shadow-sm">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        Local de Armazenamento
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-4 px-6 border-x border-b rounded-b-lg bg-card space-y-6">
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 px-3 font-medium text-muted-foreground">Armazenamento</th>
                              <th className="py-2 px-3 font-medium text-muted-foreground">Livros</th>
                              <th className="py-2 px-3 font-medium text-muted-foreground">Páginas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Opção "Todos" */}
                            <tr
                              key="all"
                              onClick={() => setSelectedStorageId(null)}
                              className={`cursor-pointer border-b last:border-0 transition-colors ${
                                selectedStorageId === null ? "bg-blue-100" : "hover:bg-muted/20"
                              }`}
                            >
                              <td className="py-2 px-3 font-medium">Todos os Armazenamentos</td>
                              <td className="py-2 px-3">
                                {books.filter((b) => b.status === config.dataStatus).length}
                              </td>
                              <td className="py-2 px-3">
                                {books
                                  .filter((b) => b.status === config.dataStatus)
                                  .reduce((sum, b) => sum + (b.expectedDocuments || 0), 0)
                                  .toLocaleString()}
                              </td>
                            </tr>

                            {storages.map((storage) => {
                              const storageBooks = books.filter(
                                (b) => b.storageName === storage.nome && b.status === config.dataStatus
                              );
                              const totalPages = storageBooks.reduce(
                                (sum, b) => sum + (b.expectedDocuments || 0),
                                0
                              );
                              return (
                                <tr
                                  key={storage.id}
                                  onClick={() => setSelectedStorageId(String(storage.id))}
                                  className={`cursor-pointer border-b last:border-0 transition-colors ${
                                    selectedStorageId === String(storage.id)
                                      ? "bg-blue-100"
                                      : "hover:bg-muted/20"
                                  }`}
                                >
                                  <td className="py-2 px-3 font-medium">{storage.nome}</td>
                                  <td className="py-2 px-3">{storageBooks.length}</td>
                                  <td className="py-2 px-3">{totalPages.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Resumo dos selecionados */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground mb-2">
                  <CheckSquare className="h-4 w-4" /> Seleção
                </h4>

                {selectedStorageId === null || selectedStorageId === "all" ? (
                  <p className="text-sm text-muted-foreground italic flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Selecione um armazenamento para ativar a seleção.
                  </p>
                ) : multiSelection.length > 0 ? (
                  <div className="grid gap-2 text-sm">
                    <p>
                      <strong>{multiSelection.length}</strong> livro(s) selecionado(s) de um total de{" "}
                      <strong>
                        {
                          books.filter(
                            (b) =>
                              b.storageName ===
                              storages.find((s) => String(s.id) === selectedStorageId)?.nome
                          ).length
                        }
                      </strong>
                      .
                    </p>
                    <p>
                      Total de páginas nos selecionados:{" "}
                      <strong>
                        {books
                          .filter((b) => multiSelection.includes(b.id))
                          .reduce((sum, b) => sum + (b.expectedDocuments || 0), 0)
                          .toLocaleString()}
                      </strong>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum livro selecionado no momento.
                  </p>
                )}
              </div>
            </CardHeader>
          <CardContent>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                      <Checkbox
                        onCheckedChange={toggleAllMultiSelection}
                        checked={multiSelection.length > 0 && multiSelection.length === availableForMultiSelectCount}
                        disabled={availableForMultiSelectCount === 0}
                      />
                  </TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Nome do Livro {getSortIndicator('name')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('storageName')}>Armazenamento {getSortIndicator('storageName')}</div></TableHead>
                  <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer select-none group" onClick={() => handleSort('expectedDocuments')}>Páginas {getSortIndicator('expectedDocuments')}</div></TableHead>
                </TableRow>
                 <TableRow>
                    <TableHead />
                    <TableHead />
                    <TableHead>
                        <Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/>
                    </TableHead>
                     <TableHead>
                        <Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead>
                        <Input placeholder="Filtrar armazenamento..." value={columnFilters['storageName'] || ''} onChange={(e) => handleColumnFilterChange('storageName', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-2">
                             <Input placeholder="Filtrar páginas..." value={columnFilters['expectedDocuments'] || ''} onChange={(e) => handleColumnFilterChange('expectedDocuments', e.target.value)} className="h-8 w-24 text-right"/>
                             <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button>
                        </div>
                    </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableBooks.length > 0 ? (
                  availableBooks.map(book => {
                    const isSelected = selection.includes(book.id);
                    return (
                        <TableRow key={book.id} data-state={isSelected ? "selected" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={multiSelection.includes(book.id)}
                              onCheckedChange={() => {
                                if (!selectedStorageId || selectedStorageId === "all") return; // desativa seleção
                                setMultiSelection(prev => 
                                  prev.includes(book.id) 
                                    ? prev.filter(id => id !== book.id)
                                    : [...prev, book.id]
                                );
                              }}
                              disabled={isSelected || !selectedStorageId || selectedStorageId === "all"} // desativa quando "Todos"
                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant={isSelected ? "destructive" : "outline"}
                              onClick={() => {
                                if (!selectedStorageId || selectedStorageId === "all") return; // desativa
                                toggleSelection(book.id);
                              }}
                              className="w-[100px]"
                              disabled={!selectedStorageId || selectedStorageId === "all"}
                            >
                              {isSelected ? (
                                <X className="mr-2 h-4 w-4" />
                              ) : (
                                <PlusCircle className="mr-2 h-4 w-4" />
                              )}
                              {isSelected ? 'Remove' : 'Add'}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                          </TableCell>
                          <TableCell>{book.projectName}</TableCell>
                          <TableCell>{book.storageName || 'N/A'}</TableCell>
                          <TableCell className="text-right">{book.expectedDocuments}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <p>{!selectedStorageId ? "Please select a storage location to view books." : (Object.values(columnFilters).some(v=>v) ? "No books match your filters." : config.emptyStateText)}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 sticky top-20">
        <AnimatePresence>
        
        {isBatchPanelOpen && (
            <motion.div
                className="lg:col-span-1 sticky top-20"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
            >
                                  {/* Estatísticas gerais e resumo dos selecionados */}
            <Accordion type="single" collapsible className="w-full pt-2 mb-6">
              <AccordionItem value="stats">
                <AccordionTrigger className="text-base px-6 font-semibold rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Estatísticas Gerais
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-6 border-x border-b rounded-b-lg bg-card space-y-6">
                                      
                    
                    {/* KPIs principais - um por linha */}
                    <div className="flex flex-col gap-4">
                      <KpiCard
                        title="Total de Livros Disponíveis"
                        value={availableBooks.length}
                        icon={BookOpen}
                        description="Livros listados de acordo com os filtros atuais."
                      />

                      <KpiCard
                        title="Total de Páginas"
                        value={availableBooks
                          .reduce((sum, b) => sum + (b.expectedDocuments || 0), 0)
                          .toLocaleString()}
                        icon={FileText}
                        description="Soma de páginas em todos os livros disponíveis."
                      />

                      <KpiCard
                        title="Armazenamentos Envolvidos"
                        value={
                          new Set(
                            availableBooks
                              .map((b) => b.storageName)
                              .filter((n) => n && n !== "N/A")
                          ).size
                        }
                        icon={Database}
                        description="Total de locais de armazenamento representados."
                      />

                      <KpiCard
                        title="Média de Páginas por Livro"
                        value={(() => {
                          const totalBooks = availableBooks.length || 1;
                          const totalPages = availableBooks.reduce(
                            (sum, b) => sum + (b.expectedDocuments || 0),
                            0
                          );
                          return Math.round(totalPages / totalBooks);
                        })()}
                        icon={ListOrdered}
                        description="Média de páginas entre os livros listados."
                      />
                    </div>

                </AccordionContent>
              </AccordionItem>
            </Accordion>
                {selection.length > 0 ? (
                    <Card className="bg-secondary/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListPlus className="h-5 w-5"/>
                                Delivery Batch
                            </CardTitle>
                            <CardDescription>
                                {selection.length} book(s) livro(s) selecionado(s) para entrega.
                                Total de páginas:{totalSelectedPages.toLocaleString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                               {selectedBooksInfo.map(book => (
                                   <div key={book.id} className="flex items-center justify-between p-2 rounded-md bg-background text-sm">
                                        <div>
                                            <p className="font-medium">{book.name}</p>
                                            <p className="text-xs text-muted-foreground">{book.projectName}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSelection(book.id)}>
                                            <X className="h-4 w-4"/>
                                        </Button>
                                   </div>
                               ))}
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button className="w-full" 
                              onClick={() => openConfirmationDialog({
                                title: `Iniciar Processamento`,
                                description: `Tem a certeza que queres iniciar o processamento dos livros selecionados?`,
                                onConfirm: () => { handleStartProcess() }
                              })}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Iniciar Processamento
                            </Button>
                            <Button variant="outline" className="w-full" onClick={clearSelectionForCurrentStorage}>
                                Limpar Seleção
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4 border-2 border-dashed rounded-lg">
                        <BookOpen className="h-12 w-12"/>
                        <h3 className="font-semibold">Nenhum livro foi adicionado ao lote</h3>
                        <p className="text-sm">Adiciona livros da tabela para criar um novo lote para iniciar o processamento.</p>
                    </div>
                )}
            </motion.div>
        )}
      </AnimatePresence>
         <>
          <AlertDialog open={confirmationState.open} onOpenChange={(open) => !open && setConfirmationState(prev => ({...prev, open: false}))}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>{confirmationState.title}</AlertDialogTitle>
                      <AlertDialogDescription>{confirmationState.description}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmationState(prev => ({...prev, open: false}))}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                          confirmationState.onConfirm();
                          setConfirmationState({ open: false, title: '', description: '', onConfirm: () => {} });
                      }}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
         </>
      </div>
    </div>
   
        
   
  )
}
