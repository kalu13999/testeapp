
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
import { FolderSync, FileText, FileJson, Play, ThumbsUp, Send } from "lucide-react";
import type { Document, BookWithProject } from "@/lib/data";
import { useWorkflow } from "@/context/workflow-context";
import { useToast } from "@/hooks/use-toast";

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
};

interface FolderViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    actionButtonLabel: string;
    actionButtonIcon: keyof typeof iconMap;
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
  const { documents, books, handleMoveBookToNextStage } = useWorkflow();
  const { toast } = useToast();
  const ActionIcon = iconMap[config.actionButtonIcon] || FolderSync;

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

  const handleAction = (bookId: string, bookName: string) => {
    handleMoveBookToNextStage(bookId, config.dataStage);
    toast({
      title: "Action Completed",
      description: `"${bookName}" has been moved to the next stage.`,
    })
  }

  return (
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
                      <Button size="sm" onClick={() => handleAction(bookId, bookName)}>
                          <ActionIcon className="mr-2 h-4 w-4" />
                          {config.actionButtonLabel}
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
  )
}
