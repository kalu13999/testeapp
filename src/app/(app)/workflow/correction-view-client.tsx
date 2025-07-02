
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
import { FolderSync, MessageSquareWarning, Trash2, Replace, FilePlus2 } from "lucide-react";
import { useWorkflow } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface CorrectionViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStage: string;
  };
}

export default function CorrectionViewClient({ config }: CorrectionViewClientProps) {
  const { 
    documents, 
    books, 
    handleMarkAsCorrected,
    addPageToBook,
    deletePageFromBook,
  } = useWorkflow();
  const { toast } = useToast();

  const rejectedBooks = React.useMemo(() => {
    return books.filter(book => book.status === config.dataStage);
  }, [books, config.dataStage]);

  const getPagesForBook = (bookId: string) => {
    return documents.filter(doc => doc.bookId === bookId);
  }

  const handleAddPage = (bookId: string, bookName: string) => {
    addPageToBook(bookId);
    toast({
      title: "Page Added",
      description: `A new blank page has been added to "${bookName}".`
    });
  }

  const handleDeletePage = (pageId: string, pageName: string) => {
    const page = documents.find(p => p.id === pageId);
    if (!page || !page.bookId) return;
    deletePageFromBook(pageId, page.bookId);
     toast({
      title: "Page Deleted",
      description: `Page "${pageName}" has been deleted.`,
      variant: "destructive"
    });
  }


  return (
     <Card>
      <CardHeader>
        <CardTitle className="font-headline">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rejectedBooks.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {rejectedBooks.map(book => {
              const pages = getPagesForBook(book.id);
              return (
              <AccordionItem value={book.id} key={book.id}>
                <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <FolderSync className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-semibold text-base">{book.name}</p>
                                <p className="text-sm text-muted-foreground">{book.projectName} - {pages.length} pages</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <div className="px-4">
                       <Button size="sm" onClick={() => handleMarkAsCorrected(book.id)}>
                         Mark as Corrected
                       </Button>
                    </div>
                </div>
                <AccordionContent>
                    <div className="px-4 py-4 space-y-4">
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

                        <div className="flex items-center justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => handleAddPage(book.id, book.name)}>
                                <FilePlus2 className="mr-2 h-4 w-4"/> Add Page
                             </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                            {pages.map(page => (
                                <Card key={page.id} className="overflow-hidden group relative">
                                    <Link href={`/documents/${page.id}`}>
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
                                    </Link>
                                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-7 w-7">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Page?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete "{page.name}". This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeletePage(page.id, page.name)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button variant="secondary" size="icon" className="h-7 w-7">
                                            <Replace className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        ) : (
           <div className="text-center py-10 text-muted-foreground">
              <p>{config.emptyStateText}</p>
           </div>
        )}
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{rejectedBooks.length}</strong> rejected books.
        </div>
      </CardFooter>
    </Card>
  )
}
