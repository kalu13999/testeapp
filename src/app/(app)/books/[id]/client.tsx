
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
import type { BookWithProject, Document } from "@/lib/data";

interface BookDetailClientProps {
  book: BookWithProject;
  pages: (Document & { client: string, status: string })[];
}

export default function BookDetailClient({ book, pages }: BookDetailClientProps) {
  return (
    <div className="space-y-6">
        <div>
            <p className="text-sm text-muted-foreground">{book.projectName} / {book.clientName}</p>
            <h1 className="font-headline text-3xl font-bold tracking-tight">{book.name}</h1>
            <p className="text-muted-foreground max-w-2xl">
                Showing {pages.length} of {book.expectedDocuments} expected pages. Once scanned, pages will appear here.
            </p>
        </div>
        
        {pages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
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
