
"use client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ThumbsDown, ThumbsUp, Undo2, Check, ScanLine, FileText, FileJson, Play, Send } from "lucide-react";
import type { BookWithProject, Document } from "@/lib/data";

const iconMap: { [key: string]: LucideIcon } = {
    Check,
    ScanLine,
    FileText,
    FileJson,
    Play,
    Send
};

interface WorkflowClientProps {
  items: (BookWithProject | (Document & { client: string, status: string }))[];
  config: {
    title: string;
    description: string;
    dataType: 'book' | 'document';
    actionButtonLabel?: string;
    actionButtonIcon?: keyof typeof iconMap;
    emptyStateText: string;
  };
  stage: string;
}

type BadgeVariant = "default" | "destructive" | "secondary" | "outline";

const getBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
        case "Delivered":
        case "Finalized":
        case "Scanned":
        case "Complete":
            return "default";
        case "Rejected":
            return "destructive";
        case "QC Pending":
        case "Processing":
        case "Scanning":
            return "secondary"
        default:
            return "outline";
    }
}


export default function WorkflowClient({ items, config, stage }: WorkflowClientProps) {
  const { title, description, dataType, actionButtonLabel, actionButtonIcon, emptyStateText } = config;
  const ActionIcon = actionButtonIcon ? iconMap[actionButtonIcon] : null;

  const renderBookRow = (item: BookWithProject) => (
    <TableRow key={item.id}>
      <TableCell className="font-medium">
         <Link href={`/books/${item.id}`} className="hover:underline">{item.name}</Link>
      </TableCell>
      <TableCell>{item.projectName}</TableCell>
      <TableCell className="hidden md:table-cell">{item.clientName}</TableCell>
      <TableCell>
        <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
      </TableCell>
      {(actionButtonLabel || stage === 'quality-control') && (
        <TableCell className="flex gap-2">
            {actionButtonLabel && (
                <Button size="sm">
                    {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                    {actionButtonLabel}
                </Button>
            )}
        </TableCell>
      )}
    </TableRow>
  )
  
  const renderDocumentRow = (item: Document & { client: string, status: string }) => (
     <TableRow key={item.id}>
      <TableCell className="font-medium">
          <Link href={`/documents/${item.id}`} className="hover:underline">{item.id}</Link>
      </TableCell>
      <TableCell>{item.client}</TableCell>
      <TableCell className="hidden md:table-cell">{item.type}</TableCell>
      <TableCell>
        <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
      </TableCell>
       <TableCell className="hidden md:table-cell">{item.lastUpdated}</TableCell>
      {(actionButtonLabel || stage === 'quality-control') && (
        <TableCell className="flex gap-2">
            {stage === 'quality-control' ? (
                <>
                    <Button size="sm" variant="outline"><ThumbsUp className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive"><ThumbsDown className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost"><Undo2 className="h-4 w-4" /></Button>
                </>
            ) : actionButtonLabel ? (
                <Button size="sm">
                    {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                    {actionButtonLabel}
                </Button>
            ) : null}
        </TableCell>
      )}
    </TableRow>
  )


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              {dataType === 'book' ? (
                <TableRow>
                  <TableHead>Book Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="hidden md:table-cell">Client</TableHead>
                  <TableHead>Status</TableHead>
                  {actionButtonLabel && <TableHead>Actions</TableHead>}
                </TableRow>
              ) : (
                 <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                  {(actionButtonLabel || stage === 'quality-control') && (
                    <TableHead>Actions</TableHead>
                  )}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                dataType === 'book'
                  ? renderBookRow(item as BookWithProject)
                  : renderDocumentRow(item as Document & { client: string, status: string })
              ))}
            </TableBody>
          </Table>
        ) : (
           <div className="text-center py-10 text-muted-foreground">
              <p>{emptyStateText}</p>
           </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{items.length}</strong> of <strong>{items.length}</strong> items
        </div>
      </CardFooter>
    </Card>
  )
}
