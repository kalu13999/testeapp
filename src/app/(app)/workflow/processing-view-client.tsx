

"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, BookOpen, Clock, CheckCircle, XCircle } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { EnrichedBook, ProcessingBatch, ProcessingBatchItem, ProcessingLog } from "@/lib/data";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ProcessingViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStatus?: string;
  };
}

export default function ProcessingViewClient({ config }: ProcessingViewClientProps) {
  const {
    books,
    processingBatches,
    processingBatchItems,
    processingLogs,
    handleCompleteProcessing,
    selectedProjectId,
  } = useAppContext();

  const [confirmationState, setConfirmationState] = React.useState<{ open: boolean; batch: ProcessingBatch | null }>({ open: false, batch: null });

  const batchesForDisplay = React.useMemo(() => {
    let batches = processingBatches
      .map(batch => {
        const items = processingBatchItems.filter(item => item.batchId === batch.id);
        const bookIds = new Set(items.map(item => item.bookId));
        return { ...batch, items, bookIds };
      })
      .filter(batch => {
        if (!selectedProjectId) return true; // Show all if no project is selected
        // Check if any book in the batch belongs to the selected project
        return batch.items.some(item => {
            const book = books.find(b => b.id === item.bookId);
            return book?.projectId === selectedProjectId;
        });
      });

    return batches;
  }, [processingBatches, processingBatchItems, selectedProjectId, books]);

  const openConfirmationDialog = (batch: ProcessingBatch) => {
    setConfirmationState({ open: true, batch });
  }

  const closeConfirmationDialog = () => {
    setConfirmationState({ open: false, batch: null });
  }

  const handleConfirm = () => {
    if (confirmationState.batch) {
      handleCompleteProcessing(confirmationState.batch.id);
    }
    closeConfirmationDialog();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesForDisplay.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesForDisplay.map(batch => {
                const logsForBatch = processingLogs.filter(log => log.batchId === batch.id);
                return (
                  <AccordionItem value={batch.id} key={batch.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                      <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                          {batch.status === 'In Progress' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                          {batch.status === 'Complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {batch.status === 'Failed' && <XCircle className="h-5 w-5 text-destructive" />}
                          <div>
                            <Link href={`/processing-batches/${batch.id}`} className="hover:underline">
                                <p className="font-semibold text-base">{batch.timestampStr}</p>
                            </Link>
                            <p className="text-sm text-muted-foreground">{batch.items.length} book(s) in this batch</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="px-4">
                        {batch.status === 'In Progress' && (
                           <Button size="sm" onClick={() => openConfirmationDialog(batch)}>
                             Mark as Complete
                           </Button>
                        )}
                      </div>
                    </div>
                    <AccordionContent className="px-4 py-4 space-y-4">
                      <div className="space-y-1">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Overall Progress</span>
                              <span className="text-sm text-muted-foreground">{batch.progress || 0}%</span>
                          </div>
                           <Progress value={batch.progress || 0} />
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
