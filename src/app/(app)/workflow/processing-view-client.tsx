

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
import { Loader2, CheckCircle, XCircle, Clock, Book, FileText, Timer, BookOpen } from "lucide-react";
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
    handleCompleteProcessing: completeProcessingBatch,
    selectedProjectId,
    storages,
  } = useAppContext();

  const [confirmationState, setConfirmationState] = React.useState<{ open: boolean; batch: ProcessingBatch | null }>({ open: false, batch: null });
  const [selectedStorageId, setSelectedStorageId] = React.useState<string>('all');

  const batchesForDisplay = React.useMemo(() => {
    let batches = processingBatches
      .map(batch => {
        const items = processingBatchItems.filter(item => item.batchId === batch.id);
        const bookIds = new Set(items.map(item => item.bookId));
        const firstBook = items.length > 0 ? books.find(b => b.id === items[0].bookId) : null;
        const storageName = firstBook?.storageName || 'N/A';
        return { ...batch, items, bookIds, storageName };
      })
      .filter(batch => {
        if (!selectedProjectId) return true; // Show all if no project is selected
        // Check if any book in the batch belongs to the selected project
        return batch.items.some(item => {
            const book = books.find(b => b.id === item.bookId);
            return book?.projectId === selectedProjectId;
        });
      });

      if (selectedStorageId !== 'all') {
        const selectedStorage = storages.find(s => s.id === selectedStorageId);
        if (selectedStorage) {
            batches = batches.filter(batch => batch.storageName === selectedStorage.nome);
        }
      }

    return batches;
  }, [processingBatches, processingBatchItems, selectedProjectId, books, selectedStorageId, storages]);

  const openConfirmationDialog = (batch: ProcessingBatch) => {
    setConfirmationState({ open: true, batch });
  }

  const closeConfirmationDialog = () => {
    setConfirmationState({ open: false, batch: null });
  }

  const handleConfirm = () => {
    if (confirmationState.batch) {
      completeProcessingBatch(confirmationState.batch.id);
    }
    closeConfirmationDialog();
  }
  
  const getStatusInfo = (status: 'In Progress' | 'Complete' | 'Failed') => {
      switch (status) {
          case 'In Progress': return { icon: Loader2, color: 'text-primary', className: 'animate-spin' };
          case 'Complete': return { icon: CheckCircle, color: 'text-green-600' };
          case 'Failed': return { icon: XCircle, color: 'text-destructive' };
          default: return { icon: Clock, color: 'text-muted-foreground' };
      }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
            <div className="pt-4">
              <Label htmlFor="storage-select">Filter by Storage Location</Label>
               <Select value={selectedStorageId} onValueChange={setSelectedStorageId}>
                  <SelectTrigger id="storage-select" className="w-[300px]">
                      <SelectValue placeholder="Select a storage..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Storages</SelectItem>
                      {storages.map(storage => (
                          <SelectItem key={storage.id} value={storage.id}>{storage.nome}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
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
                return (
                  <AccordionItem value={batch.id} key={batch.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                      <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                          <StatusIcon className={`h-5 w-5 ${statusColor} ${statusAnimation}`} />
                          <div>
                              <p className="font-semibold text-base">{batch.timestampStr}</p>
                              <p className="text-sm text-muted-foreground">{batch.items.length} book(s) in this batch</p>
                              <p className="text-xs text-muted-foreground">Storage: {batch.storageName}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="px-4 w-1/3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className="text-sm text-muted-foreground">{batch.progress || 0}%</span>
                        </div>
                         <Progress value={batch.progress || 0} />
                      </div>
                      <div className="px-4">
                        {batch.status === 'In Progress' && (
                           <Button size="sm" onClick={() => openConfirmationDialog(batch)}>
                             Mark as Complete
                           </Button>
                        )}
                      </div>
                    </div>
                    <AccordionContent className="px-4 py-4 space-y-4">
                       <div className="text-right">
                          <Button asChild variant="link" size="sm">
                              <Link href={`/processing-batches/${batch.id}`}>View Full Details</Link>
                          </Button>
                      </div>

                       <div>
                         <h4 className="text-sm font-medium mb-2">Books in Batch</h4>
                         <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Book Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Start Time</TableHead>
                              <TableHead>End Time</TableHead>
                              <TableHead className="text-right">Pages</TableHead>
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
                               )) : <p>No log entries yet.</p>}
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
            Showing <strong>{batchesForDisplay.length}</strong> processing batch(es).
          </div>
        </CardFooter>
      </Card>

      <Dialog open={confirmationState.open} onOpenChange={closeConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Processing Batch?</DialogTitle>
            <DialogDescription>
              {`This will mark the entire batch from "${confirmationState.batch?.timestampStr}" as complete and move all associated books to the next stage. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmationDialog}>Cancel</Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
