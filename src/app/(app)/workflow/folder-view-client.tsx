
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
import { FolderSync, FileText, FileJson, Play, ThumbsUp, ThumbsDown, Send, Archive, Undo2, AlertTriangle, ShieldAlert, MoreHorizontal, Info } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppDocument } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    bookName: string;
    projectName: string;
    pages: AppDocument[];
    hasError: boolean;
    hasWarning: boolean;
  };
};

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


  const stageDocuments = React.useMemo(() => {
    return documents.filter(doc => doc.status === config.dataStage);
  }, [documents, config.dataStage]);

  const groupedByBook = React.useMemo(() => {
    return stageDocuments.reduce<GroupedDocuments>((acc, doc) => {
      if (!doc.bookId) return acc;
      if (!acc[doc.bookId]) {
        const bookInfo = books.find(b => b.id === doc.bookId);
        acc[doc.bookId] = {
          bookName: bookInfo?.name || 'Unknown Book',
          projectName: bookInfo?.projectName || 'Unknown Project',
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
  }, [stageDocuments, books]);
  
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

  const handleMainAction = (bookId: string) => {
    if (stage === 'ready-for-processing') {
      handleStartProcessing(bookId);
    } else {
      handleMoveBookToNextStage(bookId, config.dataStage);
    }
  }


  const renderActions = (bookId: string, bookName: string, hasError: boolean) => {
    const actionButton = (
        <Button 
            size="sm" 
            onClick={() => openConfirmationDialog({
              title: `Are you sure?`,
              description: `This will perform the action "${config.actionButtonLabel}" on "${bookName}".`,
              onConfirm: () => handleMainAction(bookId)
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
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'Indexing')}>Indexing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'Quality Control')}>Quality Control</DropdownMenuItem>
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
                {Object.entries(groupedByBook).map(([bookId, { bookName, projectName, pages, hasError, hasWarning }]) => (
                  <AccordionItem value={bookId} key={bookId}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                        <AccordionTrigger className="flex-1 px-4 py-2">
                            <div className="flex items-center gap-3 text-left">
                                <FolderSync className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold text-base flex items-center gap-2">
                                      {bookName}
                                      {hasError && <ShieldAlert className="h-4 w-4 text-destructive" />}
                                      {hasWarning && !hasError && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{projectName} - {pages.length} pages</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="px-4">
                          {renderActions(bookId, bookName, hasError)}
                        </div>
                    </div>
                    <AccordionContent>
                      <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {pages.map(page => (
                            <div key={page.id} className="relative group">
                              <Link href={`/documents/${page.id}`}>
                                  <Card className="overflow-hidden hover:shadow-lg transition-shadow relative">
                                      <CardContent className="p-0">
                                          <Image
                                              src={page.imageUrl || "https://placehold.co/400x550.png"}
                                              alt={`Preview of ${page.name}`}
                                              data-ai-hint="document page"
                                              width={400}
                                              height={550}
                                              className="aspect-[4/5.5] object-cover w-full h-full"
                                          />
                                          {page.flag === 'error' && <div className="absolute inset-0 bg-destructive/20 border-2 border-destructive"></div>}
                                          {page.flag === 'warning' && <div className="absolute inset-0 bg-orange-500/20 border-2 border-orange-500"></div>}
                                      </CardContent>
                                      <CardFooter className="p-2 flex items-center justify-between">
                                          <p className="text-xs font-medium truncate">{page.name}</p>
                                          {page.flag && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                      {page.flag === 'error' && <ShieldAlert className="h-3 w-3 text-destructive flex-shrink-0"/>}
                                                      {page.flag === 'warning' && <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0"/>}
                                                      {page.flag === 'info' && <Info className="h-3 w-3 text-primary flex-shrink-0"/>}
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{page.flagComment}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                          )}
                                      </CardFooter>
                                  </Card>
                              </Link>
                               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
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
    </>
  )
}
