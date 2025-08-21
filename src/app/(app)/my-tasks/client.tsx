

"use client"

import * as React from "react"
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
import { Eye } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { type EnrichedBook } from "@/lib/data"
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppDocument, RejectionTag } from "@/context/workflow-context";

type ValidationTask = {
  item: {
    id: string;
    deliveryId: string;
  };
  book: EnrichedBook;
  assigneeName: string;
  batchDate: string;
};

const gridClasses: { [key: number]: string } = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
  7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
};

export default function MyTasksClient() {
  const {
    currentUser, permissions, deliveryBatches, deliveryBatchItems, books, users,
    documents, rejectionTags, selectedProjectId,
    setProvisionalDeliveryStatus, tagPageForRejection
  } = useAppContext();
  
  const [reviewState, setReviewState] = React.useState<{ open: boolean; task: ValidationTask | null }>({ open: false, task: null });
  const [columnCols, setColumnCols] = React.useState(8);
  const [rejectionDialog, setRejectionDialog] = React.useState<{ open: boolean; bookId: string; deliveryItemId: string; bookName: string; } | null>(null);
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [taggingState, setTaggingState] = React.useState<{ open: boolean; doc: AppDocument | null; availableTags: RejectionTag[]; }>({ open: false, doc: null, availableTags: [] });
  const { toast } = useToast();
  
  const canViewAll = React.useMemo(() => {
    if (!currentUser) return false;
    const userPermissions = permissions[currentUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes('/client/view-all-validations');
  }, [currentUser, permissions]);

  const myTasks = React.useMemo(() => {
    if (!currentUser) return [];

    const validatingBatchIds = new Set(deliveryBatches.filter(b => b.status === 'Validating').map(b => b.id));
    
    let relevantItems = deliveryBatchItems.filter(item => 
      validatingBatchIds.has(item.deliveryId) && item.status === 'pending'
    );
    
    if (!canViewAll) {
      relevantItems = relevantItems.filter(item => item.user_id === currentUser.id);
    } else if(currentUser.clientId) {
      const clientBookIds = new Set(books.filter(b => b.clientId === currentUser.clientId).map(b => b.id));
      relevantItems = relevantItems.filter(item => clientBookIds.has(item.bookId));
    }
    
    if (selectedProjectId) {
        const projectBookIds = new Set(books.filter(b => b.projectId === selectedProjectId).map(b => b.id));
        relevantItems = relevantItems.filter(item => projectBookIds.has(item.bookId));
    }

    return relevantItems.map(item => {
      const book = books.find(b => b.id === item.bookId);
      const batch = deliveryBatches.find(b => b.id === item.deliveryId);
      const assignee = users.find(u => u.id === item.user_id);
      if (!book || !batch) return null;
      return {
        item: { id: item.id, deliveryId: item.deliveryId },
        book,
        assigneeName: assignee?.name || 'Unassigned',
        batchDate: batch.creationDate
      }
    }).filter((task): task is ValidationTask => !!task);
    
  }, [currentUser, deliveryBatches, deliveryBatchItems, books, users, canViewAll, selectedProjectId, permissions]);

  const handleApprove = (item: ValidationTask) => {
    setProvisionalDeliveryStatus(item.item.id, item.book.id, 'approved');
    setReviewState({ open: false, task: null });
    toast({ title: `Book "${item.book.name}" Approved` });
  };
  
  const handleRejectSubmit = () => {
    if (!rejectionDialog) return;
    setProvisionalDeliveryStatus(rejectionDialog.deliveryItemId, rejectionDialog.bookId, 'rejected', rejectionComment);
    setReviewState({ open: false, task: null });
    setRejectionDialog(null);
    setRejectionComment("");
    toast({ title: `Book "${rejectionDialog.bookName}" Rejected`, variant: "destructive" });
  };

  const openTaggingDialog = (doc: AppDocument) => {
    const book = books.find(b => b.id === doc.bookId);
    if (!book || !currentUser?.clientId) return;
    const availableTags = rejectionTags.filter(tag => tag.clientId === currentUser.clientId);
    setTaggingState({
      open: true,
      doc: doc,
      availableTags: availableTags
    });
  };
  
  const closeTaggingDialog = () => {
    setTaggingState({ open: false, doc: null, availableTags: [] });
  };
  
  const handleTaggingSubmit = (tags: string[]) => {
    if (taggingState.doc) {
      tagPageForRejection(taggingState.doc.id, tags);
    }
    closeTaggingDialog();
  };

  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }
    return documents.filter(doc => doc.bookId === bookId).sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">My Tasks</CardTitle>
          <CardDescription>Review and approve or reject the books assigned to you for validation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Delivery Batch Date</TableHead>
                {canViewAll && <TableHead>Assigned To</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myTasks.length > 0 ? (
                myTasks.map(task => (
                  <TableRow key={task.item.id}>
                    <TableCell className="font-medium">{task.book.name}</TableCell>
                    <TableCell>{task.book.projectName}</TableCell>
                    <TableCell>{new Date(task.batchDate).toLocaleDateString()}</TableCell>
                    {canViewAll && <TableCell>{task.assigneeName}</TableCell>}
                    <TableCell className="text-right">
                       <Button size="sm" onClick={() => setReviewState({ open: true, task })}>
                         <Eye className="mr-2 h-4 w-4" /> Review Book
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canViewAll ? 5 : 4} className="h-24 text-center">
                    You have no pending validation tasks.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Review Dialog */}
      <Dialog open={reviewState.open} onOpenChange={(isOpen) => !isOpen && setReviewState({ open: false, task: null })}>
          <DialogContent className="max-w-[90vw] h-[95vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Reviewing: {reviewState.task?.book.name}</DialogTitle>
                  <DialogDescription>
                    Review all pages. You can tag individual pages with issues before making a final decision.
                  </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full pr-6">
                      <div className="flex items-center justify-end gap-4 py-4 sticky top-0 bg-background z-10">
                          <Label htmlFor="columns-slider" className="text-sm whitespace-nowrap">Thumbnail Size:</Label>
                          <Slider id="columns-slider" min={1} max={12} step={1} value={[columnCols]} onValueChange={(val) => setColumnCols(val[0])} className="w-full max-w-[200px]" />
                      </div>
                      <div className={`grid gap-4 ${gridClasses[columnCols]}`}>
                        {reviewState.task && getPagesForBook(reviewState.task.book.id).map(page => (
                            <div key={page.id} className="relative group">
                                <Link href={`/documents/${page.id}`} target="_blank" className="block">
                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                        <CardContent className="p-0">
                                            <Image src={page.imageUrl || "https://placehold.co/400x550.png"} alt={`Preview of ${page.name}`} data-ai-hint="document page" width={400} height={550} className="aspect-[4/5.5] object-cover w-full h-full" />
                                        </CardContent>
                                        <CardFooter className="p-2 min-h-[50px] flex-col items-start gap-1">
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
                  </ScrollArea>
              </div>
              <DialogFooter className="pt-4 border-t">
                  <Button variant="destructive" onClick={() => reviewState.task && setRejectionDialog({ open: true, bookId: reviewState.task.book.id, deliveryItemId: reviewState.task.item.id, bookName: reviewState.task.book.name })}>
                      <ThumbsDown className="mr-2 h-4 w-4"/> Reject Book
                  </Button>
                  <Button onClick={() => reviewState.task && handleApprove(reviewState.task)}>
                      <ThumbsUp className="mr-2 h-4 w-4"/> Approve Book
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
       {/* Rejection Comment Dialog */}
       <Dialog open={!!rejectionDialog} onOpenChange={(isOpen) => !isOpen && setRejectionDialog(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Reason for Rejection</DialogTitle>
                  <DialogDescription>
                      Please provide a reason for rejecting the book "{rejectionDialog?.bookName}". This will be sent to the internal team for correction.
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
                  <Button variant="outline" onClick={() => setRejectionDialog(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                      Submit Rejection
                  </Button>
              </DialogFooter>
          </DialogContent>
       </Dialog>
       
       {/* Tagging Dialog */}
       <TaggingDialog
         isOpen={taggingState.open}
         onClose={closeTaggingDialog}
         doc={taggingState.doc}
         availableTags={taggingState.availableTags}
         onSave={handleTaggingSubmit}
       />
    </>
  )
}


// --- TaggingDialog Component ---
interface TaggingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  doc: AppDocument | null;
  availableTags: RejectionTag[];
  onSave: (selectedTags: string[]) => void;
}

function TaggingDialog({ isOpen, onClose, doc, availableTags, onSave }: TaggingDialogProps) {
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (doc) {
      setSelectedTags(doc.tags || []);
    }
  }, [doc]);

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
          <DialogHeader>
              <DialogTitle>Tag "{doc.name}"</DialogTitle>
              <DialogDescription>
                  Select one or more rejection reasons for this page.
              </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <ScrollArea className="h-64">
                  <div className="space-y-2 pr-6">
                       {availableTags.length > 0 ? (
                          availableTags.map(tag => (
                              <div key={tag.id} className="flex items-center space-x-2">
                                  <Checkbox
                                      id={`tag-${tag.id}`}
                                      checked={selectedTags.includes(tag.label)}
                                      onCheckedChange={(checked) => {
                                          setSelectedTags(prev => 
                                            checked 
                                              ? [...prev, tag.label] 
                                              : prev.filter(t => t !== tag.label)
                                          );
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
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => onSave(selectedTags)}>Save Tags</Button>
          </DialogFooter>
      </DialogContent>
  </Dialog>
  )
}
