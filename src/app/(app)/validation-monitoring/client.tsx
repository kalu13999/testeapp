

"use client"

import * as React from "react"
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { MonitorCheck, ThumbsDown, ThumbsUp, Check, X, User } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { useClientValidationContext } from "@/context/workflow-cliente-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { EnrichedBook } from "@/context/workflow-context";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const StatusBadge = ({ status }: { status: 'pending' | 'approved' | 'rejected' }) => {
    if (status === 'approved') {
        return <Badge variant="default" className="bg-green-600 hover:bg-green-600/90"><Check className="mr-2 h-4 w-4"/>Approved</Badge>
    }
    if (status === 'rejected') {
        return <Badge variant="destructive"><X className="mr-2 h-4 w-4"/>Rejected</Badge>
    }
    return <Badge variant="outline">Pending</Badge>
}

export default function ValidationMonitoringClient() {
  const { deliveryBatches, deliveryBatchItems, books, currentUser, users } = useAppContext();
  const { handleValidationDeliveryBatch } = useClientValidationContext();
  const [confirmationState, setConfirmationState] = React.useState({ open: false, batchId: '', finalDecision: '' as 'approve_remaining' | 'reject_all', title: '', description: '' });

  const batchesToMonitor = React.useMemo(() => {
    return deliveryBatches
        .filter(batch => batch.status === 'Validating')
        .map(batch => {
            const itemsInBatch = deliveryBatchItems.filter(item => item.deliveryId === batch.id);
            const bookIdsInBatch = new Set(itemsInBatch.map(item => item.bookId));
            
            let booksInBatch = books.filter(book => bookIdsInBatch.has(book.id));

            if (currentUser?.clientId) {
                booksInBatch = booksInBatch.filter(book => book.clientId === currentUser.clientId);
            }

            const totalItems = itemsInBatch.length;
            const approvedCount = itemsInBatch.filter(i => i.status === 'approved').length;
            const rejectedCount = itemsInBatch.filter(i => i.status === 'rejected').length;
            const pendingCount = totalItems - approvedCount - rejectedCount;

            const assignedItems = itemsInBatch.filter(item => item.user_id);
            const booksWithAssignee = booksInBatch.map(book => {
                const item = itemsInBatch.find(i => i.bookId === book.id);
                const assignee = users.find(u => u.id === item?.user_id);
                return { ...book, itemStatus: item?.status || 'pending', assigneeName: assignee?.name || 'Unassigned' };
            });

            return {
                batchId: batch.id,
                creationDate: batch.creationDate,
                books: booksWithAssignee,
                stats: {
                    total: totalItems,
                    approved: approvedCount,
                    rejected: rejectedCount,
                    pending: pendingCount,
                    progress: totalItems > 0 ? ((approvedCount + rejectedCount) / totalItems) * 100 : 0
                }
            }
        })
        .filter(batch => batch.books.length > 0)
        .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

  }, [deliveryBatches, deliveryBatchItems, books, currentUser, users]);

  const openConfirmationDialog = (batchId: string, finalDecision: 'approve_remaining' | 'reject_all') => {
    const title = finalDecision === 'approve_remaining' ? "Approve Batch and Remaining Items?" : "Reject Entire Batch?";
    const description = finalDecision === 'approve_remaining' 
      ? "This will finalize all decisions. Any pending or unassigned books will be approved. This action cannot be undone."
      : "This will reject ALL books in this batch, regardless of individual approvals. This action cannot be undone."

    setConfirmationState({ open: true, batchId, finalDecision, title, description });
  }
  
  const closeConfirmationDialog = () => {
    setConfirmationState({ open: false, batchId: '', finalDecision: '' as any, title: '', description: '' });
  }
  
  const handleConfirm = () => {
    if (confirmationState.batchId && confirmationState.finalDecision && currentUser) {
      handleValidationDeliveryBatch(confirmationState.batchId, confirmationState.finalDecision);
    }
    closeConfirmationDialog();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Validation Monitoring</CardTitle>
          <CardDescription>Track the progress of delivery batches currently under validation.</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesToMonitor.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesToMonitor.map(({ batchId, creationDate, books: booksInBatch, stats }) => (
                <AccordionItem value={batchId} key={batchId}>
                   <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <MonitorCheck className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold text-base">
                                  Delivery Batch - {new Date(creationDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">{stats.total} book(s) in this batch</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                     <div className="px-4 w-1/3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Validation Progress</span>
                            <span className="text-sm text-muted-foreground">{stats.progress.toFixed(0)}%</span>
                        </div>
                         <Progress value={stats.progress} />
                         <div className="text-xs text-muted-foreground flex justify-between mt-1">
                            <span className="text-green-600">{stats.approved} approved</span>
                            <span className="text-destructive">{stats.rejected} rejected</span>
                            <span>{stats.pending} pending</span>
                         </div>
                      </div>
                    <div className="flex justify-end gap-2 px-4">
                        <Button size="sm" variant="destructive" onClick={() => openConfirmationDialog(batchId, 'reject_all')}>
                            <ThumbsDown className="mr-2 h-4 w-4" /> Reject All
                        </Button>
                        <Button size="sm" onClick={() => openConfirmationDialog(batchId, 'approve_remaining')}>
                            <ThumbsUp className="mr-2 h-4 w-4" /> Approve Remaining
                        </Button>
                    </div>
                  </div>
                  <AccordionContent className="p-4 space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Book</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {booksInBatch.map(book => (
                          <TableRow 
                            key={book.id}
                            className={cn(
                              book.itemStatus === 'approved' && 'bg-green-500/10',
                              book.itemStatus === 'rejected' && 'bg-red-500/10'
                            )}
                          >
                            <TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell>
                            <TableCell>{book.projectName}</TableCell>
                            <TableCell>{book.assigneeName}</TableCell>
                            <TableCell><StatusBadge status={book.itemStatus as any} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>No delivery batches are currently being validated.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={confirmationState.open} onOpenChange={closeConfirmationDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{confirmationState.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmationState.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm} className={confirmationState.finalDecision === 'reject_all' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
