
"use client"
import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Folder as FolderIcon, File as FileIcon, ChevronRight } from "lucide-react";
import type { Folder, Document } from "@/lib/data";
import type { Breadcrumb } from "@/lib/data";

interface StorageExplorerProps {
  folders: Folder[];
  documents: (Document & { client: string })[];
  breadcrumbs: Breadcrumb[];
}

export default function StorageExplorer({ folders, documents, breadcrumbs }: StorageExplorerProps) {
  const allItems = [
    ...folders.map(f => ({ ...f, itemType: 'Folder' })),
    ...documents.map(d => ({ ...d, itemType: 'Document' }))
  ];

  const BreadcrumbNav = () => (
    <nav className="flex items-center text-sm font-medium text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id || 'root'}>
                {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                {index === breadcrumbs.length - 1 ? (
                     <span className="text-foreground">{crumb.name}</span>
                ) : (
                    <Link href={crumb.id ? `/workflow/storage?folderId=${crumb.id}` : '/workflow/storage'} className="hover:text-primary">
                        {crumb.name}
                    </Link>
                )}
            </React.Fragment>
        ))}
    </nav>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Storage Explorer</CardTitle>
        <CardDescription>
          Browse, organize, and manage documents in storage.
        </CardDescription>
        <div className="pt-2">
            <BreadcrumbNav />
        </div>
      </CardHeader>
      <CardContent>
        {allItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                <TableHead>Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link 
                        href={item.itemType === 'Folder' ? `/workflow/storage?folderId=${item.id}` : `/documents/${item.id}`} 
                        className="flex items-center gap-2 hover:underline"
                    >
                      {item.itemType === 'Folder' ? <FolderIcon className="h-4 w-4 text-accent" /> : <FileIcon className="h-4 w-4 text-muted-foreground" />}
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{item.itemType}</TableCell>
                  <TableCell className="hidden md:table-cell">{item.lastUpdated || '—'}</TableCell>
                  <TableCell>{(item as any).client || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
           <div className="text-center py-10 text-muted-foreground">
              <p>This folder is empty.</p>
           </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{allItems.length}</strong> items
        </div>
      </CardFooter>
    </Card>
  )
}
