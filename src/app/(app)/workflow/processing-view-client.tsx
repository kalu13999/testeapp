
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
import { Loader2, BookOpen } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProcessingViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStage: string;
  };
}

export default function ProcessingViewClient({ config }: ProcessingViewClientProps) {
  const { 
    documents, 
    books,
    processingLogs,
    handleCompleteProcessing,
    selectedProjectId
  } = useAppContext();
  
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  
  const booksInProcessing = React.useMemo(() => {
    let docsInStage = documents.filter(doc => doc.status === config.dataStage);

    if (selectedProjectId) {
      docsInStage = docsInStage.filter(doc => doc.projectId === selectedProjectId);
    }
    
    const bookIds = new Set(docsInStage.map(doc => doc.bookId));
    return books.filter(book => bookIds.has(book.id));
  }, [documents, books, config.dataStage, selectedProjectId]);
  
  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }

  return (
    <>
     <Card>
      <CardHeader>
        <CardTitle className="font-headline">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {booksInProcessing.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {booksInProcessing.map(book => {
              const log = processingLogs.find(l => l.bookId === book.id);
              return (
              <AccordionItem value={book.id} key={book.id}>
                <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            <div>
                                <p className="font-semibold text-base">{book.name}</p>
                                <p className="text-sm text-muted-foreground">{book.projectName}</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <div className="px-4">
                       <Button size="sm" onClick={() => openConfirmationDialog({
                         title: "Complete Processing?",
                         description: `This will mark all pages for "${book.name}" as processed and move it to the next stage.`,
                         onConfirm: () => handleCompleteProcessing(book.id)
                       })}>
                         Mark as Complete
                       </Button>
                    </div>
                </div>
                <AccordionContent>
                    <div className="px-4 py-4 space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">Progress</span>
                                <span className="text-sm text-muted-foreground">{log?.progress || 0}%</span>
                            </div>
                             <Progress value={log?.progress || 0} />
                        </div>
                        <div className="space-y-1">
                             <p className="text-sm font-medium">Logs</p>
                             <Textarea 
                                readOnly 
                                value={log?.log || "No log entries yet."} 
                                className="h-40 bg-muted font-mono text-xs"
                             />
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
          Showing <strong>{booksInProcessing.length}</strong> books in processing.
        </div>
      </CardFooter>
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
    </>
  )
}
