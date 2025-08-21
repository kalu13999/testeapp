

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
import { FileClock, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, Undo2, ThumbsDown, ThumbsUp, LucideIcon } from "lucide-react";
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

const flagConfig = {
    error: { icon: ShieldAlert, color: "text-destructive", label: "Error" },
    warning: { icon: AlertTriangle, color: "text-orange-500", label: "Warning" },
    info: { icon: InfoIcon, color: "text-primary", label: "Info" },
};

export default function MyValidationsClient() {
  const { deliveryBatches, deliveryBatchItems, books, currentUser, setProvisionalDeliveryStatus, documents, rejectionTags, tagPageForRejection, permissions, users } = useAppContext();
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBookInfo, setCurrentBookInfo] = React.useState<{bookId: string, name: string, deliveryItemId: string} | null>(null);
  const [columnStates, setColumnStates] = React.useState<{ [key: string]: { cols: number } }>({});
  
  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  
  const myTasks = React.useMemo(() => {
    if (!currentUser) return [];

    const userPermissions = permissions[currentUser.role] || [];
    const canViewAllCompanyValidations = userPermissions.includes('/client/view-all-validations');

    // 1. Get all batches currently in validation
    const validatingBatchIds = new Set(
        deliveryBatches.filter(b => b.status === 'Validating').map(b => b.id)
    );

    if (validatingBatchIds.size === 0) return [];
    
    // 2. Get all items belonging to those batches
    const itemsInValidatingBatches = deliveryBatchItems.filter(item => 
        validatingBatchIds.has(item.deliveryId) && item.status === 'pending'
    );
    
    // 3. Filter items based on user permissions
    let relevantItems;
    if (canViewAllCompanyValidations && currentUser.clientId) {
      // Find all book IDs belonging to the current user's client
      const myClientBookIds = new Set(books.filter(b => b.clientId === currentUser.clientId).map(b => b.id));
      // Filter items to only those whose book is in the client's project
      relevantItems = itemsInValidatingBatches.filter(item => myClientBookIds.has(item.bookId));
    } else {
      // Regular user only sees their own assigned tasks
      relevantItems = itemsInValidatingBatches.filter(item => item.userId === currentUser.id);
    }
    
    // 4. Enrich the items with book and assignee data
    return relevantItems.map(item => {
        const book = books.find(b => b.id === item.bookId);
        if (!book) return null;
        
        const assignee = users.find(u => u.id === item.userId);

        return { 
            ...book, 
            deliveryItemId: item.id,
            assigneeName: assignee?.name || 'Unassigned',
        };
    })
    .filter((b): b is EnrichedBook & { deliveryItemId: string; assigneeName: string; } => !!b)
    .sort((a,b) => (a.priority || 'Medium') > (b.priority || 'Medium') ? -1 : 1);

  }, [deliveryBatches, deliveryBatchItems, books, currentUser, permissions, users]);

  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }
    return documents.filter(doc => doc.bookId === bookId).sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }

  const handleRejectSubmit = () => {
    if (!currentBookInfo) return;
    setProvisionalDeliveryStatus(currentBookInfo.deliveryItemId, currentBookInfo.bookId, 'rejected', rejectionComment);
    setRejectionComment("");
    setCurrentBookInfo(null);
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
          {myTasks.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {myTasks.map(book => {
                const pages = getPagesForBook(book.id);
                const bookCols = columnStates[book.id]?.cols || 8;
                return (
                  <AccordionItem value={book.id} key={book.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                        <AccordionTrigger className="flex-1 px-4 py-2">
                            <div className="flex items-center gap-3 text-left">
                                <FileClock className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold text-base">{book.name}</p>
                                    <p className="text-sm text-muted-foreground">{book.projectName} - {pages.length} pages</p>
                                    {(currentUser?.role === 'Client Manager' || currentUser?.role === 'Admin') && (
                                        <p className="text-xs text-primary">{book.assigneeName}</p>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="flex justify-end gap-2 px-4">
                            <Button size="sm" variant="destructive" onClick={() => setCurrentBookInfo({bookId: book.id, name: book.name, deliveryItemId: book.deliveryItemId})}>
                                <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                            </Button>
                            <Button size="sm" onClick={() => setProvisionalDeliveryStatus(book.deliveryItemId, book.id, 'approved')}>
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
                                                {page.tags && page.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-1">{page.tags.map(tag => (<Badge key={tag} variant={'outline'} className="text-xs">{tag}</Badge>))}</div>
                                                )}
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
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>You have no pending validation tasks.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!currentBookInfo} onOpenChange={(open) => !open && setCurrentBookInfo(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogDescription>
                    Provide a reason for rejecting the book "{currentBookInfo?.name}". This will be sent to the internal team for correction.
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
