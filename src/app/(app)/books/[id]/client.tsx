
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
import type { EnrichedBook, AppDocument } from "@/context/workflow-context";
import { useAppContext } from "@/context/workflow-context";
import { Info } from "lucide-react";

interface BookDetailClientProps {
  bookId: string;
}

export default function BookDetailClient({ bookId }: BookDetailClientProps) {
  const { books, documents } = useAppContext();

  const book = books.find(b => b.id === bookId);
  const pages = documents.filter(d => d.bookId === bookId);

  if (!book) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Book Not Found</CardTitle>
                <CardDescription>This book could not be found in the current context.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-10">
                    Please check if the book exists or has been deleted.
                </p>
            </CardContent>
        </Card>
    );
  }


  return (
    <div className="space-y-6">
        <div>
            <p className="text-sm text-muted-foreground">{book.projectName} / {book.clientName}</p>
            <h1 className="font-headline text-3xl font-bold tracking-tight">{book.name}</h1>
            <p className="text-muted-foreground max-w-2xl">
                Author: {book.author || 'N/A'} | ISBN: {book.isbn || 'N/A'} | Priority: {book.priority || 'Medium'}
            </p>
            <p className="text-muted-foreground max-w-2xl mt-1">
                Showing {pages.length} of {book.expectedDocuments} expected pages. Once scanned, pages will appear here.
            </p>
        </div>
        
         {book.info && (
            <Card className="bg-background">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <Info className="h-4 w-4" />
                    <CardTitle className="text-base">Additional Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{book.info}</p>
                </CardContent>
            </Card>
        )}

        {pages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {pages.map(page => (
                    <Link href={`/documents/${page.id}`} key={page.id}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <CardContent className="p-0">
                                <Image
                                    src={page.imageUrl || "https://placehold.co/400x550.png"}
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
        ) : (
            <div className="flex items-center justify-center text-center py-20 rounded-lg bg-muted">
                <div>
                    <h3 className="text-xl font-semibold">Awaiting Scans</h3>
                    <p className="text-muted-foreground">No pages have been scanned for this book yet.</p>
                </div>
            </div>
        )}
    </div>
  )
}
