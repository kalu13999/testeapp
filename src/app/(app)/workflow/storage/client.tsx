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
import { FolderSync, FileText } from "lucide-react";
import type { Document, BookWithProject } from "@/lib/data";
import { useWorkflow } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";

interface StorageClientProps {
  // The client gets all its data from the context.
}

type GroupedDocuments = {
  [bookId: string]: {
    bookName: string;
    projectName: string;
    pages: (Document & { client: string; status: string; name: string })[];
  };
};


export default function StorageClient({}: StorageClientProps) {
  const { documents, books, handleSendBookToIndex } = useWorkflow();
  const { toast } = useToast();

  const storageDocuments = React.useMemo(() => {
    return documents.filter(doc => doc.status === 'Storage');
  }, [documents]);

  const groupedByBook = React.useMemo(() => {
    return storageDocuments.reduce<GroupedDocuments>((acc, doc) => {
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
  }, [storageDocuments, books]);

  const handleAction = (bookId: string, bookName: string) => {
    handleSendBookToIndex(bookId);
    toast({
      title: "Book Sent to Indexing",
      description: `"${bookName}" is now ready for indexing.`,
    })
  }

  return (
     <Card>
      <CardHeader>
        <CardTitle className="font-headline">Storage</CardTitle>
        <CardDescription>
          Books that have been scanned and are awaiting indexing. Expand a book to see its pages.
        </CardDescription>
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
                      <Button size="sm" onClick={() => handleAction(bookId, bookName)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Send to Indexing
                      </Button>
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
              <p>No scanned documents are waiting in storage.</p>
           </div>
        )}
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{Object.keys(groupedByBook).length}</strong> books ready for indexing.
        </div>
      </CardFooter>
    </Card>
  )
}
