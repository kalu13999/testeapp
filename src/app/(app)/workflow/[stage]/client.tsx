
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
import { ThumbsDown, ThumbsUp, ArrowUturnLeft } from "lucide-react";

type Document = {
  id: string;
  client: string;
  status: string;
  type: string;
  lastUpdated: string;
};

interface WorkflowClientProps {
  documents: Document[];
  config: {
    title: string;
    description: string;
    actionButtonLabel?: string;
    actionButtonIcon?: LucideIcon;
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
            return "default";
        case "Rejected":
            return "destructive";
        case "QC Pending":
        case "Processing":
            return "secondary"
        default:
            return "outline";
    }
}


export default function WorkflowClient({ documents, config, stage }: WorkflowClientProps) {
  const { title, description, actionButtonLabel, actionButtonIcon: ActionIcon, emptyStateText } = config;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                {(actionButtonLabel || stage === 'quality-control') && (
                  <TableHead>
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                     <Link href={`/documents/${doc.id}`} className="hover:underline">{doc.id}</Link>
                  </TableCell>
                  <TableCell>{doc.client}</TableCell>
                  <TableCell className="hidden md:table-cell">{doc.type}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(doc.status)}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{doc.lastUpdated}</TableCell>
                  {(actionButtonLabel || stage === 'quality-control') && (
                    <TableCell className="flex gap-2">
                        {stage === 'quality-control' ? (
                            <>
                                <Button size="sm" variant="outline"><ThumbsUp className="h-4 w-4" /></Button>
                                <Button size="sm" variant="destructive"><ThumbsDown className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost"><ArrowUturnLeft className="h-4 w-4" /></Button>
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
          Showing <strong>{documents.length}</strong> of <strong>{documents.length}</strong> {stage === 'quality-control' ? 'documents' : stage}
        </div>
      </CardFooter>
    </Card>
  )
}
