

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { ListPlus, PlayCircle, BookOpen, ChevronsUpDown, ArrowUp, ArrowDown, Send, X, PlusCircle, CheckSquare, BarChart, ListOrdered, Database, Warehouse, FileText } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import type { EnrichedBook } from "@/lib/data"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DeliveryBatchCreationClientProps {
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
export default function DeliveryBatchCreationClient({ config }: DeliveryBatchCreationClientProps) {
  const { books, handleCreateDeliveryBatch, selectedProjectId, processingBatchItems, processingBatches } = useAppContext();
  const [selection, setSelection] = React.useState<string[]>([]);
  const [multiSelection, setMultiSelection] = React.useState<string[]>([]);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  const [isBatchPanelOpen, setIsBatchPanelOpen] = React.useState(true);
  

  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });

  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }
  const bookToBatchMap = React.useMemo(() => {
    const map = new Map<string, { id: string; timestampStr: string }>();
    processingBatchItems.forEach(item => {
        const batch = processingBatches.find(b => b.id === item.batchId);
        if (batch) {
            map.set(item.bookId, { id: batch.id, timestampStr: batch.timestampStr });
        }
    });
    return map;
  }, [processingBatchItems, processingBatches]);


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
    let baseBooks = books
      .filter(book => book.status === config.dataStatus)
      .map(book => ({ ...book, batchInfo: bookToBatchMap.get(book.id) }));
    
    if (selectedProjectId) {
      baseBooks = baseBooks.filter(book => book.projectId === selectedProjectId);
    }
    
    let filtered = baseBooks;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = columnId === 'batchInfo' ? book.batchInfo?.timestampStr : book[columnId as keyof typeof book];
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            const s = sorting[0];
            const valA = s.id === 'batchInfo' ? a.batchInfo?.timestampStr : a[s.id as keyof typeof a];
            const valB = s.id === 'batchInfo' ? b.batchInfo?.timestampStr : b[s.id as keyof typeof b];

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
  }, [books, config.dataStatus, selectedProjectId, columnFilters, sorting, bookToBatchMap]);

  const selectedBooksInfo = React.useMemo(() => {
      return selection.map(id => books.find(b => b.id === id)).filter((b): b is EnrichedBook => !!b);
  }, [selection, books]);

  const totalSelectedPages = React.useMemo(() => {
    return selectedBooksInfo.reduce((sum, book) => sum + book.expectedDocuments, 0);
  }, [selectedBooksInfo]);
  
  const toggleSelection = (bookId: string) => {
    setSelection(prev => 
        prev.includes(bookId)
            ? prev.filter(id => id !== bookId)
            : [...prev, bookId]
    );
  }

  const handleStartDelivery = () => {
    handleCreateDeliveryBatch(selection);
    setSelection([]);
    setMultiSelection([]);
  }

  const handleAddMultiple = () => {
    const newSelection = [...new Set([...selection, ...multiSelection])];
    setSelection(newSelection);
    setMultiSelection([]);
  }

  const toggleAllMultiSelection = () => {
    const availableForMulti = availableBooks.filter(b => !selection.includes(b.id));
    if (multiSelection.length === availableForMulti.length) {
      setMultiSelection([]);
    } else {
      setMultiSelection(availableForMulti.map(b => b.id));
    }
  }
  
  const clearSelection = () => {
    setSelection([]);
  };

  const availableForMultiSelectCount = availableBooks.filter(b => !selection.includes(b.id)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className={cn("transition-all duration-300", isBatchPanelOpen ? "lg:col-span-2" : "lg:col-span-3")}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsBatchPanelOpen(p => !p)}>
                  Batch Panel
                  <Badge variant="destructive" className="ml-2">{selection.length}</Badge>
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
            </div>

            {/* Coloquei esta div abaixo do flex principal */}
            {availableBooks.length > 0 && (
              <div className="pt-4">
                {/* Tabela de distribuição por storage */}
                <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Warehouse className="h-4 w-4" /> Distribuição por Armazenamento
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 px-3 font-medium text-muted-foreground">Armazenamento</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground">Livros</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground">Páginas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const storageStats = availableBooks.reduce((acc, book) => {
                          const name = book.storageName || "Sem Local";
                          if (!acc[name]) acc[name] = { books: 0, pages: 0 };
                          acc[name].books += 1;
                          acc[name].pages += book.expectedDocuments || 0;
                          return acc;
                        }, {} as Record<string, { books: number; pages: number }>);

                        return Object.entries(storageStats)
                          .sort((a, b) => b[1].pages - a[1].pages)
                          .map(([storageName, stats]) => (
                            <tr
                              key={storageName}
                              className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                            >
                              <td className="py-2 px-3 font-medium">{storageName}</td>
                              <td className="py-2 px-3">{stats.books}</td>
                              <td className="py-2 px-3">{stats.pages.toLocaleString()}</td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Resumo dos selecionados */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground mb-2">
                    <CheckSquare className="h-4 w-4" /> Resumo da Seleção
                  </h4>
                  {multiSelection.length > 0 ? (
                    <div className="grid gap-2 text-sm">
                      <p>
                        <strong>{multiSelection.length}</strong> livro(s) selecionado(s) de um total de <strong>{availableBooks.length}</strong>.
                      </p>
                      <p>
                        Total de páginas nos selecionados:{" "}
                        <strong>
                          {availableBooks
                            .filter((b) => multiSelection.includes(b.id))
                            .reduce((sum, b) => sum + (b.expectedDocuments || 0), 0)
                            .toLocaleString()}
                        </strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Selecione livros para ativar a seleção.
                    </p>
                  )}
                </div>
              </div>)}
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
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Nome {getSortIndicator('name')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('batchInfo')}>Lote de Processamento {getSortIndicator('batchInfo')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('scannerDeviceName')}>Scanner {getSortIndicator('scannerDeviceName')}</div></TableHead>
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
                        <Input placeholder="Filter by batch..." value={columnFilters['batchInfo'] || ''} onChange={(e) => handleColumnFilterChange('batchInfo', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead>
                        <Input placeholder="Filtrar scanner..." value={columnFilters['scannerDeviceName'] || ''} onChange={(e) => handleColumnFilterChange('scannerDeviceName', e.target.value)} className="h-8"/>
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
                                setMultiSelection(prev => 
                                  prev.includes(book.id) 
                                    ? prev.filter(id => id !== book.id)
                                    : [...prev, book.id]
                                );
                              }}
                              disabled={isSelected}
                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant={isSelected ? "destructive" : "outline"}
                              onClick={() => toggleSelection(book.id)}
                              className="w-[100px]"
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
                          <TableCell>{book.batchInfo ? <Link href={`/processing-batches/${book.batchInfo.id}`} className="hover:underline text-primary">{book.batchInfo.timestampStr.replace('Process started on ', '')}</Link> : '—'}</TableCell>
                          <TableCell>{book.scannerDeviceName || '—'}</TableCell>
                          <TableCell>{book.storageName || '—'}</TableCell>
                          <TableCell className="text-right">{book.expectedDocuments}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <p>{config.emptyStateText}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
                                {selection.length} book(s) selected for delivery.
                                Total pages: {totalSelectedPages.toLocaleString()}
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
                            <Button className="w-full" onClick={() => openConfirmationDialog({
                                title: `Iniciar Entregas`,
                                description: `Tem a certeza que queres marcar os livros selecionados como entregues?`,
                                onConfirm: () => { handleStartDelivery() }
                                                            })}>
                                <Send className="mr-2 h-4 w-4" />
                                Efetuar Entrega
                            </Button>
                             <Button variant="outline" className="w-full" onClick={clearSelection}>
                                Limpar Seleção
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4 border-2 border-dashed rounded-lg">
                        <BookOpen className="h-12 w-12"/>
                        <h3 className="font-semibold">Nenhum livro foi adicionado ao lote</h3>
                        <p className="text-sm">Adiciona livros da tabela para criar um novo lote para entrga.</p>
              
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
  )
}
