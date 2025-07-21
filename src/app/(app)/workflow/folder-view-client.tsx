

"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
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
import { FolderSync, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, Check, ScanLine, FileText, FileJson, PlayCircle, Send, UserPlus, CheckCheck, Archive, ThumbsUp, ThumbsDown, Undo2, MoreHorizontal, Loader2, Upload } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppDocument, EnrichedBook, User, RejectionTag } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_CONFIG, findStageKeyFromStatus } from "@/lib/workflow-config";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";


interface FolderViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    actionButtonLabel?: string;
    actionButtonIcon?: keyof typeof iconMap;
    emptyStateText: string;
    dataStatus?: string;
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

const iconMap: { [key: string]: LucideIcon } = {
    Check,
    ScanLine,
    FileText,
    FileJson,
    Play: PlayCircle,
    Send,
    FolderSync,
    PlayCircle,
    UserPlus,
    CheckCheck,
    Archive,
    ThumbsUp,
    Undo2,
};


export default function FolderViewClient({ stage, config }: FolderViewClientProps) {
  const { 
    documents, 
    books, 
    handleMoveBookToNextStage,
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
    getNextEnabledStage,
    projectWorkflows,
    processingBookIds
  } = useAppContext();
  const { toast } = useToast();
  const ActionIcon = config.actionButtonIcon ? iconMap[config.actionButtonIcon] : FolderSync;

  const [selection, setSelection] = React.useState<string[]>([]);
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
    role: 'indexer' | 'qc' | 'scanner' | null;
    selectedUserId: string;
  }>({ open: false, bookId: null, bookName: null, projectId: null, role: null, selectedUserId: '' });

  const [bulkAssignState, setBulkAssignState] = React.useState<{ open: boolean; role: 'indexer' | 'qc' | 'scanner' | null }>({ open: false, role: null });

  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  
  const [columnStates, setColumnStates] = React.useState<{ [key: string]: { cols: number } }>({});

  const setBookColumns = (bookId: string, cols: number) => {
    setColumnStates(prev => ({ ...prev, [bookId]: { cols } }));
  };

  const groupedByBook = React.useMemo(() => {
    if (!config.dataStatus) return {};
    let booksInStage = books.filter(book => book.status === config.dataStatus);

    if (selectedProjectId) {
      booksInStage = booksInStage.filter(book => book.projectId === selectedProjectId);
    }

    if (currentUser?.role === 'Client' && currentUser.clientId) {
      booksInStage = booksInStage.filter(b => b.clientId === currentUser.clientId);
    }
    
    return booksInStage.reduce<GroupedDocuments>((acc, book) => {
        const pages = documents.filter(doc => doc.bookId === book.id);
        acc[book.id] = {
            book,
            pages,
            hasError: pages.some(p => p.flag === 'error'),
            hasWarning: pages.some(p => p.flag === 'warning')
        };
        return acc;
    }, {});
  }, [books, documents, config.dataStatus, selectedProjectId, currentUser]);
  
  React.useEffect(() => {
    setSelection([]);
  }, [selectedProjectId]);

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

  const openAssignmentDialog = (bookId: string, bookName: string, projectId: string, role: 'indexer' | 'qc' | 'scanner') => {
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
  
  const openBulkAssignmentDialog = (role: 'indexer' | 'qc' | 'scanner') => {
    setBulkAssignState({ open: true, role });
  };

  const closeBulkAssignmentDialog = () => {
    setBulkAssignState({ open: false, role: null });
    setAssignmentState(prev => ({...prev, selectedUserId: ''})); // Reset user ID
  };

  const handleBulkAssignmentSubmit = () => {
    if (bulkAssignState.role && assignmentState.selectedUserId && selection.length > 0) {
      selection.forEach(bookId => {
        const book = Object.values(groupedByBook).find(g => g.book.id === bookId)?.book;
        if(book) {
            handleAssignUser(book.id, assignmentState.selectedUserId, bulkAssignState.role!);
        }
      });
      closeBulkAssignmentDialog();
      setSelection([]);
    }
  };

  const assignmentConfig: { [key in 'indexer' | 'qc' | 'scanner']: { permission: string } } = {
    indexer: { permission: '/workflow/to-indexing' },
    qc: { permission: '/workflow/to-checking' },
    scanner: { permission: '/workflow/to-scan' }
  };

  const getAssignableUsers = (role: 'indexer' | 'qc' | 'scanner', projectId?: string) => {
    const requiredPermission = assignmentConfig[role].permission;
    return users.filter(user => {
      if (user.role === 'Admin') return false; 
      const userPermissions = permissions[user.role] || [];
      const hasPermission = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
      if (!projectId) return hasPermission; // For bulk assignment before knowing project
      const hasProjectAccess = !user.projectIds || user.projectIds.length === 0 || user.projectIds.includes(projectId);
      return hasPermission && hasProjectAccess;
    });
  }
  
  const handleMainAction = (book: EnrichedBook) => {
    if (!book.projectId) {
        toast({ title: "Error", description: "Project ID not found for this book.", variant: "destructive" });
        return;
    }
    
    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(book.status);
    if (!currentStageKey) return;
    
    const nextStage = getNextEnabledStage(currentStageKey, workflow);
    
    if (!nextStage) {
      toast({ title: "Workflow End", description: "This is the final step for this project.", variant: "default" });
      handleMoveBookToNextStage(book.id, book.status);
      return;
    }
    
    const nextStageConfig = STAGE_CONFIG[nextStage];

    if (nextStageConfig?.assigneeRole) {
      openAssignmentDialog(book.id, book.name, book.projectId, nextStageConfig.assigneeRole);
    } else {
       handleMoveBookToNextStage(book.id, book.status);
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


  const getDynamicActionButtonLabel = React.useCallback((book: EnrichedBook) => {
    if (config.actionButtonLabel) {
      return config.actionButtonLabel;
    }
    
    if (!book.projectId) return "Next Step";
    
    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(book.status);
    if (!currentStageKey) return "Next Step";
    
    const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
    if (!nextStageKey) return "End of Workflow";
    
    const nextStageConfig = STAGE_CONFIG[nextStageKey];
    if (nextStageConfig.assigneeRole) {
        return `Assign for ${nextStageConfig.title}`;
    }
    return `Move to ${nextStageConfig.title}`;
  }, [config.actionButtonLabel, projectWorkflows, getNextEnabledStage]);


  const renderActions = (bookGroup: GroupedDocuments[string]) => {
    const { book, hasError } = bookGroup;
    const { id: bookId, name: bookName, status } = book;

    const actionButtonLabel = getDynamicActionButtonLabel(book);
    const isProcessing = processingBookIds.includes(bookId);

    const actionButton = actionButtonLabel ? (
        <Button 
            size="sm" 
            onClick={() => openConfirmationDialog({
              title: `Are you sure?`,
              description: `This will perform the action "${actionButtonLabel}" on "${bookName}".`,
              onConfirm: () => handleMainAction(book)
            })}
            disabled={hasError || actionButtonLabel === "End of Workflow" || isProcessing}
        >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ActionIcon className="mr-2 h-4 w-4" />}
            {isProcessing ? "Processing..." : actionButtonLabel}
        </Button>
    ) : null;

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
        return null;
      default: 
        if (!actionButtonLabel) return null;
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

  const handleBulkAction = () => {
    if (selection.length === 0) return;

    if (stage === 'storage') {
        openBulkAssignmentDialog('indexer');
        return;
    }
    
    const firstBook = groupedByBook[selection[0]]?.book;
    if (!firstBook) return;

    const actionLabel = getDynamicActionButtonLabel(firstBook);
    openConfirmationDialog({
      title: `Perform action on ${selection.length} books?`,
      description: `This will perform "${actionLabel}" for all selected books.`,
      onConfirm: () => {
        selection.forEach(bookId => {
          const book = groupedByBook[bookId]?.book;
          if (book) handleMainAction(book);
        });
        setSelection([]);
      }
    });
  }
  
  const handleBulkResubmit = (targetStage: string) => {
    const stageKey = findStageKeyFromStatus(targetStage);
    if (!stageKey) {
      toast({ title: "Workflow Error", description: `Could not find configuration for stage: ${targetStage}`, variant: "destructive" });
      return;
    }
    const stageConfig = STAGE_CONFIG[stageKey];
    openConfirmationDialog({
      title: `Resubmit ${selection.length} books?`,
      description: `This will resubmit all selected books to the "${stageConfig.title}" stage.`,
      onConfirm: () => {
        selection.forEach(bookId => handleResubmit(bookId, targetStage));
        setSelection([]);
      }
    });
  }

  const renderBulkActions = () => {
    if (selection.length === 0) return null;
    
    const disabled = selection.some(bookId => groupedByBook[bookId]?.hasError);
    let actionButton = null;

    if (stage === 'storage') {
       return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selection.length} selected</span>
          <Button size="sm" onClick={() => openBulkAssignmentDialog('indexer')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Selected for Indexing
          </Button>
        </div>
      );
    }
    
    if (stage === 'pending-deliveries') {
      actionButton = (
        <Button size="sm" onClick={handleBulkAction}>
          <ThumbsUp className="mr-2 h-4 w-4" /> Approve Selected
        </Button>
      );
    } else if (stage === 'corrected') {
      actionButton = (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Send className="mr-2 h-4 w-4" /> Resubmit Selected To...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleBulkResubmit('To Indexing')}>Indexing</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkResubmit('To Checking')}>Quality Control</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkResubmit('Delivery')}>Delivery</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    } else if (config.actionButtonLabel && stage !== 'archive') {
      const firstBook = groupedByBook[selection[0]]?.book;
      if (!firstBook) return null;
      const label = getDynamicActionButtonLabel(firstBook);
      actionButton = (
         <Button size="sm" onClick={handleBulkAction} disabled={disabled || label === "End of Workflow"}>
          <ActionIcon className="mr-2 h-4 w-4" />
          {label} ({selection.length})
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{selection.length} selected</span>
        {actionButton}
      </div>
    );
  }

  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }

    return documents
        .filter(doc => doc.bookId === bookId)
        .sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }
  
  const gridClasses: { [key: number]: string } = {
    2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
    7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
  };

  return (
    <>
     <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="font-headline">{config.title}</CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                </div>
                {renderBulkActions()}
            </div>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedByBook).length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {Object.values(groupedByBook).map((bookGroup) => {
                  const { book, pages, hasError, hasWarning } = bookGroup;
                  const isProcessing = processingBookIds.includes(book.id);
                  const pageCount = pages.length;
                  const bookCols = columnStates[book.id]?.cols || 8;

                  return (
                  <AccordionItem value={book.id} key={book.id}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                        <div className="pl-4">
                            <Checkbox
                                checked={selection.includes(book.id)}
                                onCheckedChange={(checked) => {
                                    setSelection(prev =>
                                        checked
                                            ? [...prev, book.id]
                                            : prev.filter(id => id !== book.id)
                                    );
                                }}
                                aria-label={`Select book ${book.name}`}
                            />
                        </div>
                        <AccordionTrigger className="flex-1 px-4 py-2">
                            <div className="flex items-center gap-3 text-left">
                                <FolderSync className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold text-base flex items-center gap-2">
                                      {book.name}
                                      {hasError && <ShieldAlert className="h-4 w-4 text-destructive" />}
                                      {hasWarning && !hasError && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                      {book.projectName} - 
                                      {isProcessing ? 
                                        <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Loading pages...</span> 
                                        : <span>{pageCount} pages</span>
                                      }
                                    </p>
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
                          {stage === 'client-rejections' && (
                            <Card className="bg-destructive/10 border-destructive/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base text-destructive font-semibold">
                                        <MessageSquareWarning className="h-5 w-5" /> Client Rejection Reason
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-destructive-foreground/90">{book.rejectionReason || "No reason provided."}</p>
                                </CardContent>
                            </Card>
                          )}

                          <div className="flex items-center justify-end gap-4">
                            <Label htmlFor={`columns-slider-${book.id}`} className="text-sm">Thumbnail Size:</Label>
                            <Slider
                                id={`columns-slider-${book.id}`}
                                min={2}
                                max={12}
                                step={1}
                                value={[bookCols]}
                                onValueChange={(value) => setBookColumns(book.id, value[0])}
                                className="w-[150px]"
                            />
                          </div>

                          <div className={`grid gap-4 ${gridClasses[bookCols] || 'grid-cols-8'}`}>
                            {isProcessing && pages.length === 0 ? (
                              Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="aspect-[4/5.5] w-full h-full" />
                              ))
                            ) : (
                              getPagesForBook(book.id).map(page => (
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
                                              <p className="text-xs font-medium whitespace-pre-wrap">{page.name}</p>

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
                            ))
                            )}
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
    
    <Dialog open={bulkAssignState.open} onOpenChange={closeBulkAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selection.length} books to a {bulkAssignState.role}</DialogTitle>
            <DialogDescription>
                Select a user to process all selected books. They will be added to their personal queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={assignmentState.selectedUserId} onValueChange={(val) => setAssignmentState(s => ({...s, selectedUserId: val}))}>
              <SelectTrigger>
                <SelectValue placeholder={`Select an ${bulkAssignState.role}...`} />
              </SelectTrigger>
              <SelectContent>
                {bulkAssignState.role && getAssignableUsers(bulkAssignState.role).map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkAssignmentDialog}>Cancel</Button>
            <Button onClick={handleBulkAssignmentSubmit} disabled={!assignmentState.selectedUserId}>
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
