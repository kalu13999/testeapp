

"use client"

import * as React from "react"
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppContext } from "@/context/workflow-context";
import { Loader2, CheckCircle, XCircle, Clock, Book, FileText, Timer, BookOpen, Send, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProcessingBatch } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ProcessedViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStatus?: string;
  };
}


export default function ProcessedViewClient({ config }: ProcessedViewClientProps) {
  const {
    books,
    processingBatches,
    processingBatchItems,
    processingLogs,
    completeProcessingBatch,
    failureProcessingBatch,
    selectedProjectId,
    storages,
    handleSendBatchToNextStage,
  } = useAppContext();

  const [selection, setSelection] = React.useState<string[]>([]);
  const [confirmationState, setConfirmationState] = React.useState<{ open: boolean; batchIds: string[] | null, title: string, description: string }>({ open: false, batchIds: null, title: '', description: '' });
  const [selectedStorageId, setSelectedStorageId] = React.useState<string>('all');

  const batchesForDisplay = React.useMemo(() => {
    let batches = processingBatches
      .filter(batch => batch.status === 'Complete')
      .map(batch => {
        const items = processingBatchItems.filter(item => item.batchId === batch.id);
        const firstBook = items.length > 0 ? books.find(b => b.id === items[0].bookId) : null;
        const storageName = firstBook?.storageName || 'N/A';
        const storageId = firstBook?.storageId;
        const hasFailedItems = items.some(item => item.status === 'CQ Failed');
        return { ...batch, items, storageName, storageId, hasFailedItems };
      })
      .filter(batch => {
        if (!selectedProjectId) return true; // Show all if no project is selected
        return batch.items.some(item => {
            const book = books.find(b => b.id === item.bookId);
            return book?.projectId === selectedProjectId;
        });
      });

      if (selectedStorageId !== 'all') {
        const selectedStorage = storages.find(s => String(s.id) === selectedStorageId);
        if (selectedStorage) {
            batches = batches.filter(batch => batch.storageName === selectedStorage.nome);
        }
      }

    return batches.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [processingBatches, processingBatchItems, selectedProjectId, books, selectedStorageId, storages]);

  const openConfirmationDialog = (batchIds: string[]) => {
    const isSingle = batchIds.length === 1;
    const batchName = isSingle ? `batch from ${processingBatches.find(b => b.id === batchIds[0])?.timestampStr}` : `${batchIds.length} batches`;
    
    setConfirmationState({ 
      open: true, 
      batchIds,
      title: `Send ${isSingle ? "batch" : "batches"} to Final QC?`,
      description: `This will move all books within ${batchName} to the "Final Quality Control" stage.`
    });
  }

  const closeConfirmationDialog = () => {
    setConfirmationState({ open: false, batchIds: null, title: '', description: '' });
  }

  const handleConfirm = () => {
    if (confirmationState.batchIds) {
      handleSendBatchToNextStage(confirmationState.batchIds);
      setSelection([]);
    }
    closeConfirmationDialog();
  }
  
  const getStatusInfo = (batch: (typeof batchesForDisplay)[0]) => {
      if (batch.hasFailedItems) return { icon: AlertTriangle, color: 'text-orange-500', className: '' };
      switch (batch.status) {
          case 'In Progress': return { icon: Loader2, color: 'text-primary', className: 'animate-spin' };
          case 'Complete': return { icon: CheckCircle, color: 'text-green-600', className: '' };
          case 'Failed': return { icon: XCircle, color: 'text-destructive', className: '' };
          default: return { icon: Clock, color: 'text-muted-foreground', className: '' };
      }
  }

  return (
    <>
      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline">{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
              {selection.length > 0 && (
                 <Button size="sm" onClick={() => openConfirmationDialog(selection)}>
                    <Send className="mr-2 h-4 w-4"/>
                    Enviar Selecionados ({selection.length}) para o QC Final
                 </Button>
              )}
           </div>
            <div className="pt-4">
              <Label htmlFor="storage-select">Filtrar por Localização de Armazenamento</Label>
               <Select value={selectedStorageId} onValueChange={setSelectedStorageId}>
                  <SelectTrigger id="storage-select" className="w-[300px]">
                      <SelectValue placeholder="Selecione um armazenamento..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos os Armazenamentos</SelectItem>
                      {storages.map(storage => (
                          <SelectItem key={storage.id} value={String(storage.id)}>{storage.nome}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
        </CardHeader>
        <CardContent>
          {batchesForDisplay.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesForDisplay.map(batch => {
                const StatusIcon = getStatusInfo(batch).icon;
                const statusColor = getStatusInfo(batch).color;
                const statusAnimation = getStatusInfo(batch).className;

                  const totalExpectedDocuments = batch.items.reduce((total, item) => {
                  const book = books.find(b => b.id === item.bookId);
                  return total + (book?.expectedDocuments || 0);
                }, 0);
                return (
                  <AccordionItem value={batch.id} key={batch.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                      <div className="pl-4">
                         <Checkbox
                          checked={selection.includes(batch.id)}
                          onCheckedChange={(checked) => {
                            setSelection(prev =>
                              checked
                                ? [...prev, batch.id]
                                : prev.filter(id => id !== batch.id)
                            );
                          }}
                          aria-label={`Select batch ${batch.id}`}
                        />
                      </div>
                      <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                          <StatusIcon className={`h-5 w-5 ${statusColor} ${statusAnimation}`} />
                          <div>
                              <p className="font-semibold text-base">{batch.timestampStr}</p>
                              <p className="text-sm text-muted-foreground">{batch.items.length} livro(s) neste lote</p>
                              <p className="text-sm text-muted-foreground">{totalExpectedDocuments} documento(s) neste lote</p>
                              <p className="text-xs text-muted-foreground">Armazenamento: {batch.storageName}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="px-4 w-1/3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Progresso Geral</span>
                            <span className="text-sm text-muted-foreground">{batch.progress || 0}%</span>
                        </div>
                         <Progress value={batch.progress || 0} />
                      </div>
                      <div className="px-4">
                        <Button size="sm" variant="secondary" onClick={() => openConfirmationDialog([batch.id])}>
                            <Send className="mr-2 h-4 w-4"/>
                            Send to Final QC
                        </Button>
                      </div>
                    </div>
                    <AccordionContent className="px-4 py-4 space-y-4">
                       <div className="text-right">
                          <Button asChild variant="link" size="sm">
                              <Link href={`/processing-batches/${batch.id}`}>Ver Detalhes Completos</Link>
                          </Button>
                      </div>
                      <div>
                         <h4 className="text-sm font-medium mb-2">Livros no Lote</h4>
                         <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome do Livro</TableHead>
                              <TableHead>Projeto</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Início</TableHead>
                              <TableHead>Fim</TableHead>
                              <TableHead className="text-right">Páginas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batch.items.map(item => {
                              const book = books.find(b => b.id === item.bookId);
                              if (!book) return null;
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                  </TableCell>
                                  <TableCell>{book.projectName}</TableCell>
                                  <TableCell>
                                    <Badge variant={item.status === 'Complete' ? 'default' : item.status === 'Failed' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                                  </TableCell>
                                  <TableCell>{item.itemStartTime ? format(new Date(item.itemStartTime), 'p') : '—'}</TableCell>
                                  <TableCell>{item.itemEndTime ? format(new Date(item.itemEndTime), 'p') : '—'}</TableCell>
                                  <TableCell className="text-right">{book.expectedDocuments?.toLocaleString() || '—'}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                         </Table>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
              <BookOpen className="h-12 w-12" />
              <p>{config.emptyStateText}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            A mostrar <strong>{batchesForDisplay.length}</strong> lote(s) concluído(s).
          </div>
        </CardFooter>
      </Card>

      <Dialog open={confirmationState.open} onOpenChange={closeConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationState.title}</DialogTitle>
            <DialogDescription>{confirmationState.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmationDialog}>Cancelar</Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
