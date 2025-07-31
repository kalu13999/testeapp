
"use client"

import * as React from "react"
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileClock, Package, ThumbsDown, ThumbsUp, X, Check, BookOpen } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrichedBook } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";


interface DeliveryValidationClientProps {
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStatus?: string;
  };
}

type GroupedBooks = {
    [batchId: string]: {
        batchId: string;
        creationDate: string;
        books: EnrichedBook[];
    }
}

export default function DeliveryValidationClient({ config }: DeliveryValidationClientProps) {
  const { books, deliveryBatches, deliveryBatchItems, handleClientAction, currentUser } = useAppContext();
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [currentBook, setCurrentBook] = React.useState<{id: string, name: string} | null>(null);

  const batchesToValidate = React.useMemo(() => {
    return deliveryBatches
        .filter(batch => batch.status === 'Ready')
        .map(batch => {
            const batchBookIds = new Set(deliveryBatchItems.filter(item => item.deliveryId === batch.id).map(item => item.bookId));
            const booksInBatch = books.filter(book => batchBookIds.has(book.id) && (currentUser?.clientId ? book.clientId === currentUser.clientId : true));
            return {
                batchId: batch.id,
                creationDate: batch.creationDate,
                books: booksInBatch
            }
        })
        .filter(batch => batch.books.length > 0)
        .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

  }, [deliveryBatches, deliveryBatchItems, books, currentUser]);

  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }

  const handleRejectSubmit = () => {
    if (!currentBook) return;
    handleClientAction(currentBook.id, 'reject', rejectionComment);
    setRejectionComment("");
    setCurrentBook(null);
  }
  
  const handleApproveBatch = (batchId: string) => {
    const batch = batchesToValidate.find(b => b.batchId === batchId);
    if (!batch) return;
    
    openConfirmationDialog({
      title: `Approve all ${batch.books.length} books in this batch?`,
      description: "This will finalize all books in the batch. This action cannot be undone.",
      onConfirm: () => {
        batch.books.forEach(book => handleClientAction(book.id, 'approve'));
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesToValidate.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesToValidate.map(({ batchId, creationDate, books }) => (
                <AccordionItem value={batchId} key={batchId}>
                   <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <Package className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold text-base">
                                  Delivery Batch - {new Date(creationDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">{books.length} book(s) ready for review</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <div className="px-4">
                      <Button size="sm" variant="secondary" onClick={() => handleApproveBatch(batchId)}>
                        <Check className="mr-2 h-4 w-4" /> Approve Whole Batch
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="p-4 space-y-4">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Book</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {books.map(book => (
                                <TableRow key={book.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                    </TableCell>
                                    <TableCell>{book.projectName}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="destructive" onClick={() => setCurrentBook(book)}>
                                                <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                                            </Button>
                                            <Button size="sm" onClick={() => openConfirmationDialog({
                                                title: `Approve "${book.name}"?`,
                                                description: 'This will finalize the book and its documents.',
                                                onConfirm: () => handleClientAction(book.id, 'approve')
                                            })}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
              <FileClock className="h-12 w-12"/>
              <p>{config.emptyStateText}</p>
           </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={confirmationState.open} onOpenChange={(open) => !open && setConfirmationState(prev => ({...prev, open: false}))}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{confirmationState.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmationState.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmationState(prev => ({...prev, open: false}))}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    confirmationState.onConfirm();
                    setConfirmationState({ open: false, title: '', description: '', onConfirm: () => {} });
                }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={!!currentBook} onOpenChange={(open) => !open && setCurrentBook(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogDescription>
                    Please provide a reason for rejecting the book "{currentBook?.name}". This will be sent to the internal team for correction.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <Label htmlFor="rejection-comment">Comment</Label>
                <Textarea 
                    id="rejection-comment"
                    placeholder="e.g., Page 5 is blurry, please re-scan."
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCurrentBook(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                    Submit Rejection
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
