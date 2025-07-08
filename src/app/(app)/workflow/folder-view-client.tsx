
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
import { FolderSync, FileText, FileJson, Play, ThumbsUp, ThumbsDown, Send, Archive, Undo2, AlertTriangle, ShieldAlert, MoreHorizontal, Info, UserPlus, BookOpen, Check, Tag } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppDocument, EnrichedBook, User, RejectionTag } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type IconMap = {
  [key: string]: React.ElementType;
};

const iconMap: IconMap = {
  FolderSync,
  FileText,
  FileJson,
  Play,
  ThumbsUp,
  Send,
  Archive,
  Undo2,
  UserPlus,
  Check,
};

interface FolderViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    actionButtonLabel?: string;
    actionButtonIcon?: keyof typeof iconMap;
    emptyStateText: string;
    dataStage: string;
  };
}

type GroupedDocuments = {
  [bookId: string]: {
    book: EnrichedBook;
    pages: AppDocument[];
    hasError: boolean;
    hasWarning: boolean;
  };
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-center gap-x-4">
    <p className="text-muted-foreground">{label}</p>
    <p className="col-span-2 font-medium">{value}</p>
  </div>
);


export default function FolderViewClient({ stage, config }: FolderViewClientProps) {
  const { 
    documents, 
    books, 
    handleMoveBookToNextStage,
    handleStartProcessing,
    handleClientAction,
    handleFinalize,
    handleMarkAsCorrected,
    handleResubmit,
    updateDocumentFlag,
    users,
    permissions,
    handleAssignUser,
    selectedProjectId,
    rejectionTags,
    currentUser,
    tagPageForRejection,
  } = useAppContext();
  const { toast } = useToast();
  const ActionIcon = config.actionButtonIcon ? iconMap[config.actionButtonIcon] : FolderSync;

  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBook, setCurrentBook] = React.useState<{id: string, name: string} | null>(null);

  const [flagDialogState, setFlagDialogState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    flag: AppDocument['flag'];
    comment: string;
  }>({ open: false, docId: null, docName: null, flag: null, comment: '' });
  
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  
  const [assignmentState, setAssignmentState] = React.useState<{
    open: boolean;
    bookId: string | null;
    bookName: string | null;
    projectId: string | null;
    role: 'indexer' | 'qc' | null;
    selectedUserId: string;
  }>({ open: false, bookId: null, bookName: null, projectId: null, role: null, selectedUserId: '' });
  
  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });

  const stageDocuments = React.useMemo(() => {
    let baseDocs = documents.filter(doc => doc.status === config.dataStage);
    if(selectedProjectId) {
      baseDocs = baseDocs.filter(doc => doc.projectId === selectedProjectId);
    }
    // For client-facing views, filter by their client ID if they are a client user
    if (currentUser?.role === 'Client' && currentUser.clientId) {
      const clientBooks = new Set(books.filter(b => b.clientId === currentUser.clientId).map(b => b.id));
      baseDocs = baseDocs.filter(doc => doc.bookId && clientBooks.has(doc.bookId));
    }

    return baseDocs;
  }, [documents, config.dataStage, selectedProjectId, currentUser, books]);

  const groupedByBook = React.useMemo(() => {
    const initialGroups = stageDocuments.reduce<GroupedDocuments>((acc, doc) => {
      if (!doc.bookId) return acc;
      const bookInfo = books.find(b => b.id === doc.bookId);
      if (!bookInfo) return acc;

      if (!acc[doc.bookId]) {
        acc[doc.bookId] = {
          book: bookInfo,
          pages: [],
          hasError: false,
          hasWarning: false,
        };
      }
      acc[doc.bookId].pages.push(doc);
      if (doc.flag === 'error') acc[doc.bookId].hasError = true;
      if (doc.flag === 'warning') acc[doc.bookId].hasWarning = true;
      return acc;
    }, {});
    
    if (stage === 'storage') {
        const filteredGroups: GroupedDocuments = {};
        for (const bookId in initialGroups) {
            const book = books.find(b => b.id === bookId);
            if (book && book.status === 'In Progress') {
                filteredGroups[bookId] = initialGroups[bookId];
            }
        }
        return filteredGroups;
    }

    return initialGroups;
  }, [stageDocuments, books, stage]);
  
  const handleRejectSubmit = () => {
    if (!currentBook) return;
    handleClientAction(currentBook.id, 'reject', rejectionComment);
    setRejectionComment("");
    setCurrentBook(null);
  }

  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }
  
  const openFlagDialog = (doc: AppDocument, flag: NonNullable<AppDocument['flag']>) => {
    setFlagDialogState({
      open: true,
      docId: doc.id,
      docName: doc.name,
      flag: flag,
      comment: doc.flagComment || '',
    });
  };

  const closeFlagDialog = () => {
    setFlagDialogState({ open: false, docId: null, docName: null, flag: null, comment: '' });
  };

  const handleFlagSubmit = () => {
    if (flagDialogState.docId && flagDialogState.flag) {
      updateDocumentFlag(flagDialogState.docId, flagDialogState.flag, flagDialogState.comment);
    }
    closeFlagDialog();
  };

  const openAssignmentDialog = (bookId: string, bookName: string, projectId: string, role: 'indexer' | 'qc') => {
    setAssignmentState({ open: true, bookId, bookName, projectId, role, selectedUserId: '' });
  };

  const closeAssignmentDialog = () => {
    setAssignmentState({ open: false, bookId: null, bookName: null, projectId: null, role: null, selectedUserId: '' });
  };

  const handleAssignmentSubmit = () => {
    if (assignmentState.bookId && assignmentState.selectedUserId && assignmentState.role) {
      handleAssignUser(assignmentState.bookId, assignmentState.selectedUserId, assignmentState.role);
      closeAssignmentDialog();
    }
  };
  
  const assignmentConfig: { [key in 'indexer' | 'qc']: { permission: string } } = {
    indexer: { permission: '/workflow/to-indexing' },
    qc: { permission: '/workflow/to-checking' }
  };

  const getAssignableUsers = (role: 'indexer' | 'qc', projectId: string) => {
    const requiredPermission = assignmentConfig[role].permission;
    return users.filter(user => {
      const userPermissions = permissions[user.role] || [];
      const hasPermission = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
      const hasProjectAccess = user.projectIds?.includes(projectId);
      return hasPermission && hasProjectAccess;
    });
  }

  const handleMainAction = (book: EnrichedBook) => {
    const { id: bookId, name: bookName, projectId } = book;
    if (stage === 'ready-for-processing') {
      handleStartProcessing(bookId);
    } else if (stage === 'storage') {
      openAssignmentDialog(bookId, bookName, projectId, 'indexer');
    } else if (stage === 'indexing-started') {
      openAssignmentDialog(bookId, bookName, projectId, 'qc');
    } else if (stage === 'checking-started') {
      handleMoveBookToNextStage(bookId, config.dataStage);
    } else {
      handleMoveBookToNextStage(bookId, config.dataStage);
    }
  }

  const openTaggingDialog = (doc: AppDocument) => {
    const book = Object.values(groupedByBook).map(g => g.book).find(b => b.id === doc.bookId);
    if (!book) return;
    
    // Always load tags based on the book's client.
    const availableTags = rejectionTags.filter(tag => tag.clientId === book.clientId);

    setTaggingState({
      open: true,
      docId: doc.id,
      docName: doc.name,
      selectedTags: doc.tags,
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


  const renderActions = (bookGroup: GroupedDocuments[string]) => {
    const { book, hasError } = bookGroup;
    const { id: bookId, name: bookName } = book;
    
    const actionButton = (
        <Button 
            size="sm" 
            onClick={() => openConfirmationDialog({
              title: `Are you sure?`,
              description: `This will perform the action "${config.actionButtonLabel}" on "${bookName}".`,
              onConfirm: () => handleMainAction(book)
            })}
            disabled={hasError}
        >
            <ActionIcon className="mr-2 h-4 w-4" />
            {config.actionButtonLabel}
        </Button>
    );

    switch (stage) {
      case 'pending-deliveries':
        return (
          <div className="flex gap-2">
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" onClick={() => setCurrentBook({id: bookId, name: bookName})}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
            </AlertDialogTrigger>
            <Button size="sm" onClick={() => openConfirmationDialog({
                title: 'Approve Book?',
                description: `This will approve all documents for "${bookName}" and finalize them.`,
                onConfirm: () => handleClientAction(bookId, 'approve')
            })}>
              <ThumbsUp className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        );
      case 'finalized':
        return (
          <Button size="sm" onClick={() => openConfirmationDialog({
              title: 'Archive Book?',
              description: `This will archive all documents for "${bookName}". This is a final action.`,
              onConfirm: () => handleFinalize(bookId)
          })}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </Button>
        );
       case 'client-rejections':
        return (
           <Button size="sm" onClick={() => openConfirmationDialog({
              title: 'Mark as Corrected?',
              description: `This will mark "${bookName}" as corrected and make it available for resubmission.`,
              onConfirm: () => handleMarkAsCorrected(bookId)
           })}>
            <Undo2 className="mr-2 h-4 w-4" /> Mark as Corrected
          </Button>
        );
       case 'corrected':
         return (
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Send className="mr-2 h-4 w-4" /> Resubmit To...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'To Indexing')}>Indexing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'To Checking')}>Quality Control</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'Delivery')}>Delivery</DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>
         )
      case 'archive':
        return null; // No actions in archive
      default: // For standard workflow stages
        if (!config.actionButtonLabel) return null;
        if (hasError) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{actionButton}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cannot proceed. One or more pages have an error.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        return actionButton;
    }
  }

  return (
    <>
      <AlertDialog>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedByBook).length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {Object.values(groupedByBook).map((bookGroup) => {
                  const { book, pages, hasError, hasWarning } = bookGroup;
                  return (
                  <AccordionItem value={book.id} key={book.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                        <AccordionTrigger className="flex-1 px-4 py-2">
                            <div className="flex items-center gap-3 text-left">
                                <FolderSync className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold text-base flex items-center gap-2">
                                      {book.name}
                                      {hasError && <ShieldAlert className="h-4 w-4 text-destructive" />}
                                      {hasWarning && !hasError && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{book.projectName} - {pages.length} pages</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="px-4">
                          {renderActions(bookGroup)}
                        </div>
                    </div>
                    <AccordionContent>
                      <div className="p-4 space-y-4">
                          <Card>
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <Info className="h-4 w-4" />
                                <CardTitle className="text-base">Book Details</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-4">
                                <DetailItem label="Book" value={<Link href={`/books/${book.id}`} className="text-primary hover:underline">{book.name}</Link>} />
                                <DetailItem label="Project" value={book.projectName} />
                                <DetailItem label="Client" value={book.clientName} />
                                <Separator />
                                <DetailItem label="Author" value={book.author || '—'} />
                                <DetailItem label="ISBN" value={book.isbn || '—'} />
                                <DetailItem label="Publication Year" value={book.publicationYear || '—'} />
                                <Separator />
                                <DetailItem label="Priority" value={book.priority || '—'} />
                                {book.info && (
                                <>
                                <Separator />
                                <div className="pt-2 grid grid-cols-1 gap-2">
                                    <p className="text-muted-foreground">Additional Info</p>
                                    <p className="font-medium whitespace-pre-wrap">{book.info}</p>
                                </div>
                                </>
                                )}
                            </CardContent>
                          </Card>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                            {pages.map(page => (
                                <div key={page.id} className="relative group">
                                  <Link href={`/documents/${page.id}`} className="block">
                                      <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                          <CardContent className="p-0">
                                              <Image
                                                  src={page.imageUrl || "https://placehold.co/400x550.png"}
                                                  alt={`Preview of ${page.name}`}
                                                  data-ai-hint="document page"
                                                  width={400}
                                                  height={550}
                                                  className="aspect-[4/5.5] object-cover w-full h-full"
                                              />
                                              <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="absolute inset-0">
                                                            {page.flag === 'error' && <div className="absolute inset-0 bg-destructive/20 border-2 border-destructive"></div>}
                                                            {page.flag === 'warning' && <div className="absolute inset-0 bg-orange-500/20 border-2 border-orange-500"></div>}
                                                        </div>
                                                    </TooltipTrigger>
                                                    {page.flagComment && <TooltipContent><p>{page.flagComment}</p></TooltipContent>}
                                                </Tooltip>
                                            </TooltipProvider>
                                          </CardContent>
                                          <CardFooter className="p-2 flex-col items-start gap-1">
                                              <p className="text-xs font-medium break-words">{page.name}</p>

                                              {page.flag && page.flagComment && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <div className="flex items-start gap-1.5 text-xs w-full text-muted-foreground">
                                                        {page.flag === 'error' && <ShieldAlert className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive"/>}
                                                        {page.flag === 'warning' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-orange-500"/>}
                                                        {page.flag === 'info' && <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary"/>}
                                                        <p className="whitespace-pre-wrap break-words">{page.flagComment}</p>
                                                      </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{page.flagComment}</p></TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}

                                              {page.tags && page.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                  {page.tags.map(tag => (
                                                    <Badge key={tag} variant={stage === 'pending-deliveries' ? 'outline' : 'destructive'} className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              )}
                                          </CardFooter>
                                      </Card>
                                  </Link>
                                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {stage === 'pending-deliveries' && (
                                        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openTaggingDialog(page)}>
                                            <Tag className="h-4 w-4" />
                                        </Button>
                                    )}
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button variant="secondary" size="icon" className="h-7 w-7">
                                                  <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => openFlagDialog(page, 'error')}>
                                                  <ShieldAlert className="mr-2 h-4 w-4 text-destructive" /> Mark Error
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => openFlagDialog(page, 'warning')}>
                                                  <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" /> Mark Warning
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => openFlagDialog(page, 'info')}>
                                                  <Info className="mr-2 h-4 w-4 text-primary" /> Mark Info
                                              </DropdownMenuItem>
                                              {page.flag && (
                                                <>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => updateDocumentFlag(page.id, null)}>
                                                      Clear Flag
                                                  </DropdownMenuItem>
                                                </>
                                              )}
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                  </div>
                                </div>
                            ))}
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )})}
              </Accordion>
            ) : (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
                  <BookOpen className="h-12 w-12"/>
                  <p>{config.emptyStateText}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{Object.keys(groupedByBook).length}</strong> books in this stage.
            </div>
          </CardFooter>
        </Card>
        
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Reason for Rejection</AlertDialogTitle>
              <AlertDialogDescription>
                  Please provide a reason for rejecting the book "{currentBook?.name}". This will be sent to the internal team for correction.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
              <Label htmlFor="rejection-comment">Comment</Label>
              <Textarea 
                  id="rejection-comment"
                  placeholder="e.g., Page 5 is blurry, please re-scan."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
              />
          </div>
          <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                  Submit Rejection
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <Dialog open={flagDialogState.open} onOpenChange={closeFlagDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Flag Document: "{flagDialogState.docName}"</DialogTitle>
                <DialogDescription>
                    Provide a comment for the flag. This will be visible to the team.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <Label htmlFor="flag-comment">Comment</Label>
                <Textarea
                    id="flag-comment"
                    placeholder={`Reason for the ${flagDialogState.flag}...`}
                    value={flagDialogState.comment}
                    onChange={(e) => setFlagDialogState(prev => ({...prev, comment: e.target.value}))}
                    className="min-h-[100px]"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={closeFlagDialog}>Cancel</Button>
                <Button onClick={handleFlagSubmit} disabled={!flagDialogState.comment.trim()}>Save Comment</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={assignmentState.open} onOpenChange={closeAssignmentDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign User for "{assignmentState.bookName}"</DialogTitle>
          <DialogDescription>
            Select a user to process this book. It will then move to their personal queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={assignmentState.selectedUserId} onValueChange={(val) => setAssignmentState(s => ({...s, selectedUserId: val}))}>
            <SelectTrigger>
              <SelectValue placeholder={`Select an ${assignmentState.role}...`} />
            </SelectTrigger>
            <SelectContent>
              {assignmentState.projectId && assignmentState.role && 
                getAssignableUsers(assignmentState.role, assignmentState.projectId).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeAssignmentDialog}>Cancel</Button>
          <Button onClick={handleAssignmentSubmit} disabled={!assignmentState.selectedUserId}>
            Assign and Confirm
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
                        ) : (
                          <p className="text-sm text-muted-foreground text-center">No rejection tags have been defined for this client.</p>
                        )}
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
