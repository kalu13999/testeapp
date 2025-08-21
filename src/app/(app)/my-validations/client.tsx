
"use client"

import * as React from "react"
import Link from "next/link";
import Image from "next/image";
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
import { FileClock, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, ThumbsDown, ThumbsUp, Check, User, type LucideIcon } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { type AppDocument, type EnrichedBook, type RejectionTag } from "@/context/workflow-context";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface MyValidationsClientProps {}

type ValidationTask = {
  item: {
    id: string;
    deliveryId: string;
  };
  book: EnrichedBook;
  assignee: {
    id: string;
    name: string;
  } | null;
};

type BatchGroup = {
  batchId: string;
  creationDate: string;
  tasks: ValidationTask[];
}

const flagConfig = {
    error: { icon: ShieldAlert, color: "text-destructive", label: "Error" },
    warning: { icon: AlertTriangle, color: "text-orange-500", label: "Warning" },
    info: { icon: Info, color: "text-primary", label: "Info" },
};

export default function MyValidationsClient({}: MyValidationsClientProps) {
  const { 
    deliveryBatches, deliveryBatchItems, books, currentUser, users, permissions,
    documents, rejectionTags, tagPageForRejection, 
    setProvisionalDeliveryStatus, finalizeDeliveryBatch,
    selectedProjectId
  } = useAppContext();

  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBookInfo, setCurrentBookInfo] = React.useState<{ bookId: string; name: string; deliveryItemId: string } | null>(null);
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [columnStates, setColumnStates] = React.useState<{ [key: string]: { cols: number } }>({});
  
  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });

  const canViewAll = React.useMemo(() => {
    if (!currentUser) return false;
    const userPermissions = permissions[currentUser.role] || [];
    return userPermissions.includes('/client/view-all-validations');
  }, [currentUser, permissions]);

 const batchesToValidate = React.useMemo((): BatchGroup[] => {
    if (!currentUser?.clientId) return [];
    
    // 1. Get all batches currently in validation for the user's company
    const validatingBatches = deliveryBatches.filter(b => {
        if (b.status !== 'Validating') return false;
        // Check if any book in this batch belongs to the current user's client
        const firstItem = deliveryBatchItems.find(i => i.deliveryId === b.id);
        if (!firstItem) return false;
        const book = books.find(b => b.id === firstItem.bookId);
        return book?.clientId === currentUser.clientId;
    });

    const validatingBatchIds = new Set(validatingBatches.map(b => b.id));

    // 2. Get all pending items from those batches
    let pendingItems = deliveryBatchItems.filter(item => 
      validatingBatchIds.has(item.deliveryId) && item.status === 'pending'
    );
    
    // 3. Filter items based on permission
    if (!canViewAll) {
      pendingItems = pendingItems.filter(item => item.userId === currentUser.id);
    }
    
    // 4. Enrich and group by batch
    const groupedByBatch = new Map<string, BatchGroup>();

    pendingItems.forEach(item => {
        const batch = validatingBatches.find(b => b.id === item.deliveryId);
        const book = books.find(b => b.id === item.bookId);

        if (batch && book && (!selectedProjectId || book.projectId === selectedProjectId)) {
            const assignee = item.userId ? users.find(u => u.id === item.userId) : null;
            const task: ValidationTask = {
                item: { id: item.id, deliveryId: item.deliveryId },
                book,
                assignee: assignee ? { id: assignee.id, name: assignee.name } : null
            };

            if (!groupedByBatch.has(batch.id)) {
                groupedByBatch.set(batch.id, { batchId: batch.id, creationDate: batch.creationDate, tasks: [] });
            }
            groupedByBatch.get(batch.id)!.tasks.push(task);
        }
    });

    // 5. Filter out any groups that might now be empty after project filtering
    return Array.from(groupedByBatch.values())
      .filter(group => group.tasks.length > 0)
      .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

  }, [deliveryBatches, deliveryBatchItems, books, users, currentUser, canViewAll, selectedProjectId]);


  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }
    return documents.filter(doc => doc.bookId === bookId).sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }
  
  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }

  const handleRejectSubmit = () => {
    if (!currentBookInfo) return;
    setProvisionalDeliveryStatus(currentBookInfo.deliveryItemId, currentBookInfo.bookId, 'rejected', rejectionComment);
    setRejectionComment("");
    setCurrentBookInfo(null);
  }
  
  const handleApproveBatch = (batchId: string) => {
    openConfirmationDialog({
      title: `Confirm Validation & Approve Remaining?`,
      description: "This will approve all pending books and finalize the entire batch (both approved and rejected books). This action cannot be undone.",
      onConfirm: () => finalizeDeliveryBatch(batchId, 'approve_remaining'),
    });
  }

  const openTaggingDialog = (doc: AppDocument) => {
    const book = books.find(b => b.id === doc.bookId);
    if (!book || !currentUser?.clientId) return;
    const availableTags = rejectionTags.filter(tag => tag.clientId === currentUser.clientId);
    setTaggingState({
      open: true,
      docId: doc.id,
      docName: doc.name,
      selectedTags: doc.tags || [],
      availableTags: availableTags
    });
  };
  
  const closeTaggingDialog = () => {
    setTaggingState({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  };
  
  const handleTaggingSubmit = () => {
    if (taggingState.docId) {
      tagPageForRejection(taggingState.docId, taggingState.selectedTags);
    }
    closeTaggingDialog();
  };
  
  const setBookColumns = (bookId: string, cols: number) => {
    setColumnStates(prev => ({ ...prev, [bookId]: { cols } }));
  };

  const gridClasses: { [key: number]: string } = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
    7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">My Validations</CardTitle>
          <CardDescription>Review and approve or reject the books assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesToValidate.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesToValidate.map(({ batchId, creationDate, tasks }) => (
                <AccordionItem value={batchId} key={batchId}>
                   <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <FileClock className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold text-base">
                                  Delivery Batch - {new Date(creationDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">{tasks.length} book(s) in your queue for this batch</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <div className="px-4">
                      {canViewAll && (
                        <Button size="sm" variant="secondary" onClick={() => handleApproveBatch(batchId)}>
                          <Check className="mr-2 h-4 w-4" /> Confirm & Finalize Batch
                        </Button>
                      )}
                    </div>
                  </div>
                  <AccordionContent className="p-4 space-y-4">
                     <Accordion type="multiple" className="w-full">
                        {tasks.map(task => {
                            const { book, assignee } = task;
                            const pages = getPagesForBook(book.id);
                            const bookCols = columnStates[book.id]?.cols || 8;
                            return (
                                <AccordionItem value={book.id} key={book.id}>
                                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                                        <AccordionTrigger className="flex-1 px-4 py-2">
                                            <div className="flex items-center gap-3 text-left">
                                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-semibold">{book.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-muted-foreground">{book.projectName}</p>
                                                        {canViewAll && assignee && (
                                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <User className="h-3 w-3"/>
                                                            <span>{assignee.name}</span>
                                                          </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex justify-end gap-2 px-4">
                                            <Button size="sm" variant="destructive" onClick={() => setCurrentBookInfo({bookId: book.id, name: book.name, deliveryId: task.item.deliveryId, deliveryItemId: task.item.id})}>
                                                <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                                            </Button>
                                            <Button size="sm" onClick={() => setProvisionalDeliveryStatus(task.item.id, book.id, 'approved')}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                        </div>
                                    </div>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="flex items-center justify-end gap-4">
                                            <Label htmlFor={`columns-slider-${book.id}`} className="text-sm whitespace-nowrap">Thumbnail Size:</Label>
                                            <Slider id={`columns-slider-${book.id}`} min={1} max={12} step={1} value={[bookCols]} onValueChange={(value) => setBookColumns(book.id, value[0])} className="w-full max-w-[200px]" />
                                            <Badge variant="outline" className="w-16 justify-center">{bookCols} {bookCols > 1 ? 'cols' : 'col'}</Badge>
                                        </div>
                                         <div className={`grid gap-4 ${gridClasses[bookCols] || 'grid-cols-8'}`}>
                                            {pages.map(page => (
                                                <div key={page.id} className="relative group">
                                                    <Link href={`/documents/${page.id}`} className="block">
                                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                                            <CardContent className="p-0">
                                                                <Image src={page.imageUrl || "https://placehold.co/400x550.png"} alt={`Preview of ${page.name}`} data-ai-hint="document page" width={400} height={550} className="aspect-[4/5.5] object-cover w-full h-full" />
                                                            </CardContent>
                                                            <CardFooter className="p-2 flex-col items-start gap-1">
                                                                <p className="text-xs font-medium break-words">{page.name}</p>
                                                                {page.tags && page.tags.length > 0 && (<div className="flex flex-wrap gap-1 pt-1">{page.tags.map(tag => (<Badge key={tag} variant={'outline'} className="text-xs">{tag}</Badge>))}</div>)}
                                                            </CardFooter>
                                                        </Card>
                                                    </Link>
                                                    <Button variant="secondary" size="icon" className="h-7 w-7 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openTaggingDialog(page)}>
                                                        <Tag className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                     </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
                <FileClock className="h-12 w-12"/>
                <h3 className="font-semibold text-lg">No Pending Validations</h3>
                <p>You have no assigned books awaiting validation at this time.</p>
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
      
      <Dialog open={!!currentBookInfo} onOpenChange={(open) => !open && setCurrentBookInfo(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogDescription>
                    Please provide a reason for rejecting the book "{currentBookInfo?.name}". This will be sent to the internal team for correction.
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
                <Button variant="outline" onClick={() => setCurrentBookInfo(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                    Submit Rejection
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={taggingState.open} onOpenChange={closeTaggingDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Tag "{taggingState.docName}"</DialogTitle>
                <DialogDescription>
                    Select one or more rejection reasons for this page.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <ScrollArea className="h-64">
                    <div className="space-y-2 pr-6">
                         {taggingState.availableTags.length > 0 ? (
                            taggingState.availableTags.map(tag => (
                                <div key={tag.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`tag-${tag.id}`}
                                        checked={taggingState.selectedTags.includes(tag.label)}
                                        onCheckedChange={(checked) => {
                                            setTaggingState(prev => ({
                                                ...prev,
                                                selectedTags: checked
                                                    ? [...prev.selectedTags, tag.label]
                                                    : prev.selectedTags.filter(t => t !== tag.label)
                                            }));
                                        }}
                                    />
                                    <Label htmlFor={`tag-${tag.id}`} className="flex flex-col gap-1 w-full">
                                        <span className="font-medium">{tag.label}</span>
                                        <span className="text-xs text-muted-foreground">{tag.description}</span>
                                    </Label>
                                </div>
                            ))
                        ) : (<p className="text-sm text-muted-foreground text-center">No rejection tags have been defined for this client.</p>)}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={closeTaggingDialog}>Cancel</Button>
                <Button onClick={handleTaggingSubmit}>Save Tags</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
