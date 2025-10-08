

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
import { Loader2, CheckCircle, XCircle, PauseCircle, Clock, Book, FileText, Timer, BookOpen, RefreshCw } from "lucide-react";
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


interface ProcessingViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStatus?: string;
  };
}

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode, icon?: React.ElementType }) => (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
    </div>
    <div className="font-medium text-base pl-6">{value}</div>
  </div>
);

export default function ProcessingViewClient({ config }: ProcessingViewClientProps) {
  const {
    books,
    processingBatches,
    processingBatchItems,
    processingLogs,
    completeProcessingBatch,
    statusProcessingBatch,
    failureProcessingBatch,
    selectedProjectId,
    storages,
    currentUser,
  } = useAppContext();

  const [confirmationState, setConfirmationState] = React.useState<{ open: boolean; batch: (ProcessingBatch & { storageId?: string }) | null, status: string }>({ open: false, batch: null, status: '' });
  const [selectedStorageId, setSelectedStorageId] = React.useState<string>('all');
  const [selectedProcBatchesStatus, setSelectedProcBatchesStatus] = React.useState<string>('In Progress');

  const statuses = processingBatches.map(b => b.status);
  const uniqueStatuses = [...new Set(statuses)];
  const filteredStatuses = uniqueStatuses.filter(s => s !== "Complete");

  const batchesForDisplay = React.useMemo(() => {
    let batches = processingBatches
      .filter(batch => batch.status !== 'Complete')
      .map(batch => {
        const items = processingBatchItems.filter(item => item.batchId === batch.id);
        const bookIds = new Set(items.map(item => item.bookId));
        const firstBook = items.length > 0 ? books.find(b => b.id === items[0].bookId) : null;
        const storageName = firstBook?.storageName || 'N/A';
        const storageId = firstBook?.storageId;
        return { ...batch, items, bookIds, storageName, storageId };
      })
      .filter(batch => {
        if (!selectedProjectId) return true;
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

      if (selectedProcBatchesStatus !== 'all') {
         if (selectedProcBatchesStatus) {
            batches = batches.filter(batch => batch.status === selectedProcBatchesStatus);
        }
      }

    return batches.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [processingBatches, processingBatchItems, selectedProjectId, books, selectedStorageId, storages, selectedProcBatchesStatus]);

  const openConfirmationDialog = (batch: ProcessingBatch & { storageId?: string }, status: string) => {
    setConfirmationState({ open: true, batch, status });
  }

  const closeConfirmationDialog = () => {
    setConfirmationState({ open: false, batch: null, status: '' });
  }

  const handleConfirm = () => {
    if (!confirmationState.batch) return;

    if (confirmationState.status === "Complete") {
      completeProcessingBatch(confirmationState.batch.id);
    } 
    else if (confirmationState.status === "Failed" || confirmationState.status === "Pause" || confirmationState.status === "In Progress") {
      statusProcessingBatch(confirmationState.batch.id, confirmationState.status);
    }
    else if (confirmationState.status === "Open Protocol") {
        if(!confirmationState.batch.storageId) {
            console.error("Storage ID is missing for the failed batch.");
            return;
        }
      failureProcessingBatch(confirmationState.batch.id, String(confirmationState.batch.storageId));
    }

    closeConfirmationDialog();
  }
  
  const getStatusInfo = (status: 'In Progress' | 'Complete' | 'Failed' | 'Pause') => {
      switch (status) {
          case 'In Progress': return { icon: Loader2, color: 'text-primary', className: 'animate-spin' };
          case 'Complete': return { icon: CheckCircle, color: 'text-green-600' };
          case 'Failed': return { icon: XCircle, color: 'text-destructive' };
          case 'Pause': return { icon: PauseCircle, color: 'text-yellow-500' };
          default: return { icon: Clock, color: 'text-muted-foreground' };
      }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
            <div className="flex gap-4 pt-4">
              <div className="flex flex-col">
                <Label htmlFor="storage-select" className="mb-2">Filtrar por Local de Armazenamento</Label>
                <Select value={selectedStorageId} onValueChange={setSelectedStorageId}>
                  <SelectTrigger id="storage-select" className="w-[300px]">
                    <SelectValue placeholder="Selecionar um armazenamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Armazenamentos</SelectItem>
                    {storages.map(storage => (
                      <SelectItem key={storage.id} value={String(storage.id)}>
                        {storage.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label htmlFor="status-select" className="mb-2">Filtrar por Estado de Processamento</Label>
                <Select value={selectedProcBatchesStatus} onValueChange={setSelectedProcBatchesStatus}>
                  <SelectTrigger id="status-select" className="w-[300px]">
                    <SelectValue placeholder="Selecionar um estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    {filteredStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {batchesForDisplay.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesForDisplay.map(batch => {
                const logsForBatch = processingLogs.filter(log => log.batchId === batch.id);
                const StatusIcon = getStatusInfo(batch.status).icon;
                const statusColor = getStatusInfo(batch.status).color;
                const statusAnimation = getStatusInfo(batch.status).className;

                const totalExpectedDocuments = batch.items.reduce((total, item) => {
                  const book = books.find(b => b.id === item.bookId);
                  return total + (book?.expectedDocuments || 0);
                }, 0);
                return (
                  <AccordionItem value={batch.id} key={batch.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
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

                         {batch.status === 'Pause' && (
                           <Button size="sm" onClick={() => openConfirmationDialog(batch, "In Progress")}>
                             Continuar
                           </Button>
                        )}
                        {batch.status === 'In Progress' && (
                           <Button size="sm" variant="secondary" onClick={() => openConfirmationDialog(batch, "Pause")}>
                             Pausar
                           </Button>
                        )}
                        {batch.status === 'In Progress' && (
                           <Button size="sm" variant="destructive" onClick={() => openConfirmationDialog(batch, "Failed")}>
                             Marcar Falha
                           </Button>
                        )}
                        {batch.status === 'Failed' &&  currentUser?.role === 'Admin' && (
                           <Button size="sm" onClick={() => openConfirmationDialog(batch, "Complete")}>
                             Marcar Completo
                           </Button>
                        )}
                         {batch.status === 'Failed' && (
                           <Button size="sm" variant="destructive" onClick={() => openConfirmationDialog(batch, "Open Protocol")}>
                            <RefreshCw className="mr-2 h-4 w-4"/>
                             Reprocessar/Corrigir
                           </Button>
                        )}
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
                                  <TableCell>{item.status}</TableCell>
                                  <TableCell>{item.itemStartTime ? format(new Date(item.itemStartTime), 'HH:mm:ss') : '—'}</TableCell>
                                  <TableCell>{item.itemEndTime ? format(new Date(item.itemEndTime), 'HH:mm:ss') : '—'}</TableCell>
                                  <TableCell className="text-right">{book.expectedDocuments}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                         </Table>
                       </div>

                      <div className="space-y-1">
                           <h4 className="text-sm font-medium">Logs</h4>
                           <ScrollArea className="h-40 w-full rounded-md border">
                            <div className="p-4 font-mono text-xs">
                               {logsForBatch.length > 0 ? logsForBatch.map(log => (
                                 <p key={log.id}>
                                    <span className="text-muted-foreground">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                    <span className={`ml-2 ${log.level === 'ERROR' ? 'text-destructive' : ''}`}>{log.message}</span>
                                 </p>
                               )) : <p>Nenhum log encontrado.</p>}
                            </div>
                           </ScrollArea>
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
            A mostrar <strong>{batchesForDisplay.length}</strong> lote(s) em processamento.
          </div>
        </CardFooter>
      </Card>

       <Dialog open={confirmationState.open} onOpenChange={closeConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationState.status === 'Failed' && 'Marcar lote como falha?'}
              {confirmationState.status === 'Complete' && 'Forçar concluir processamento do lote?'}
              {confirmationState.status === 'Pause' && 'Pausar processamento do lote?'}
              {confirmationState.status === 'In Progress' && 'Continuar processamento do lote?'}
              {confirmationState.status === 'Open Protocol' && 'Abrir protocolo?'}
            </DialogTitle>
            <DialogDescription>
              {confirmationState.status === 'Failed' &&
                `Isto marcará o lote inteiro de "${confirmationState.batch?.timestampStr}" como falhado. 
                Atenção: verifique se não está em processamento antes de confirmar.`}
              {confirmationState.status === 'Complete' &&
                `Isto marcará o lote inteiro de "${confirmationState.batch?.timestampStr}" como completo e moverá todos os livros associados para a próxima etapa. Esta ação não pode ser desfeita.`}
              {confirmationState.status === 'Pause' &&
                `Isto vai pausar o processamento do lote de "${confirmationState.batch?.timestampStr}".`}
              {confirmationState.status === 'In Progress' &&
                `Isto vai retomar o processamento do lote de "${confirmationState.batch?.timestampStr}".`}
              {confirmationState.status === 'Open Protocol' &&
                `Isto abrirá o protocolo de falha para o lote de "${confirmationState.batch?.timestampStr}". Use isto para investigar e resolver problemas antes de tentar novamente.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmationDialog}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
