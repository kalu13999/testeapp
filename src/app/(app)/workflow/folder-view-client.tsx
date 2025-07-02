
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
import { FolderSync, FileText, FileJson, Play, ThumbsUp, ThumbsDown, Send, Archive, Undo2 } from "lucide-react";
import type { Document } from "@/lib/data";
import { useWorkflow } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
    pages: (Document & { client: string; status: string; name: string })[];
  };
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
  } = useWorkflow();
  const { toast } = useToast();
  const ActionIcon = config.actionButtonIcon ? iconMap[config.actionButtonIcon] : FolderSync;

  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBook, setCurrentBook] = React.useState<{id: string, name: string} | null>(null);


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
        };
      }
      acc[doc.bookId].pages.push(doc);
      return acc;
    }, {});
  }, [stageDocuments, books]);
  
  const handleRejectSubmit = () => {
    if (!currentBook) return;
    handleClientAction(currentBook.id, 'reject', rejectionComment);
    setRejectionComment("");
    setCurrentBook(null);
  }

  const renderActions = (bookId: string, bookName: string) => {
    switch (stage) {
      case 'pending-deliveries':
        return (
          <div className="flex gap-2">
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" onClick={() => setCurrentBook({id: bookId, name: bookName})}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
            </AlertDialogTrigger>
            <Button size="sm" onClick={() => handleClientAction(bookId, 'approve')}>
              <ThumbsUp className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        );
      case 'finalized':
        return (
          <Button size="sm" onClick={() => handleFinalize(bookId)}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </Button>
        );
       case 'client-rejections':
        return (
          <Button size="sm" onClick={() => handleMarkAsCorrected(bookId)}>
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
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'Processing')}>Processing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'Quality Control')}>Quality Control</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResubmit(bookId, 'Delivery')}>Delivery</DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>
         )
      case 'archive':
        return null; // No actions in archive
      default: // For standard workflow stages
        if (!config.actionButtonLabel) return null;
        return (
          <Button size="sm" onClick={() => {
            handleMoveBookToNextStage(bookId, config.dataStage);
            toast({
              title: "Action Completed",
              description: `"${bookName}" has been moved to the next stage.`,
            })
          }}>
            <ActionIcon className="mr-2 h-4 w-4" />
            {config.actionButtonLabel}
          </Button>
        );
    }
  }

  return (
    <AlertDialog>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedByBook).length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedByBook).map(([bookId, { bookName, projectName, pages }]) => (
                <AccordionItem value={bookId} key={bookId}>
                  <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                      <AccordionTrigger className="flex-1 px-4 py-2">
                          <div className="flex items-center gap-3 text-left">
                              <FolderSync className="h-5 w-5 text-primary" />
                              <div>
                                  <p className="font-semibold text-base">{bookName}</p>
                                  <p className="text-sm text-muted-foreground">{projectName} - {pages.length} pages</p>
                              </div>
                          </div>
                      </AccordionTrigger>
                      <div className="px-4">
                        {renderActions(bookId, bookName)}
                      </div>
                  </div>
                  <AccordionContent>
                    <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {pages.map(page => (
                          <Link href={`/documents/${page.id}`} key={page.id}>
                              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                  <CardContent className="p-0">
                                      <Image
                                          src="https://placehold.co/400x550.png"
                                          alt={`Preview of ${page.name}`}
                                          data-ai-hint="document page"
                                          width={400}
                                          height={550}
                                          className="aspect-[4/5.5] object-cover w-full h-full"
                                      />
                                  </CardContent>
                                   <CardFooter className="p-2">
                                      <p className="text-xs font-medium truncate">{page.name}</p>
                                   </CardFooter>
                              </Card>
                          </Link>
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
  )
}
