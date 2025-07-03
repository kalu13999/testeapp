
"use client"

import * as React from "react";
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
import { ThumbsDown, ThumbsUp, Undo2, Check, ScanLine, FileText, FileJson, Play, Send, FolderSync, Upload, XCircle, CheckCircle, FileWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/workflow-context";
import { EnrichedBook, AppDocument } from "@/context/workflow-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const iconMap: { [key: string]: LucideIcon } = {
    Check,
    ScanLine,
    FileText,
    FileJson,
    Play,
    Send,
    FolderSync,
};

interface WorkflowClientProps {
  config: {
    title: string;
    description: string;
    dataType: 'book' | 'document';
    actionButtonLabel?: string;
    actionButtonIcon?: keyof typeof iconMap;
    emptyStateText: string;
    dataStatus?: string; // For books
    dataStage?: string; // For documents
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
        case "Quality Control":
        case "Processing":
        case "Indexing":
        case "Storage":
            return "secondary"
        default:
            return "outline";
    }
}


export default function WorkflowClient({ config, stage }: WorkflowClientProps) {
  const { books, documents, handleBookAction, handleMoveBookToNextStage, updateDocumentStatus } = useAppContext();
  const { toast } = useToast();
  const { title, description, dataType, actionButtonLabel, actionButtonIcon, emptyStateText, dataStatus, dataStage } = config;
  const ActionIcon = actionButtonIcon ? iconMap[actionButtonIcon] : null;

  const [scanState, setScanState] = React.useState<{ open: boolean; book: EnrichedBook | null; folderName: string | null; fileCount: number | null; }>({ open: false, book: null, folderName: null, fileCount: null });
  
  const displayItems = React.useMemo(() => {
    if (dataType === 'book' && dataStatus) {
      return books.filter(book => book.status === dataStatus);
    }
    if (dataType === 'document' && dataStage) {
      return documents.filter(doc => doc.status === dataStage);
    }
    return [];
  }, [books, documents, dataType, dataStatus, dataStage]);
  
  const handleGenericAction = (item: any) => {
    if (dataType === 'book') {
        handleBookAction(item.id, item.status);
    } else { // It's a document
        handleMoveBookToNextStage(item.bookId, item.status);
    }
  };
  
  const handleQCAction = (item: any, newStatus: string) => {
    let actionText = '';
    let nextStageStatus = '';

    switch(newStatus) {
        case 'Approved':
            actionText = 'approved and sent to Delivery';
            nextStageStatus = 'Delivery';
            break;
        case 'Rejected':
            actionText = 'rejected';
            nextStageStatus = 'Rejected';
            break;
        case 'Sent Back':
            actionText = 'sent back to Processing';
            nextStageStatus = 'Processing';
            break;
    }
    updateDocumentStatus(item.id, nextStageStatus);
    toast({
        title: `Action: ${newStatus}`,
        description: `"${item.name}" has been ${actionText}.`,
    })
  }

  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const pathParts = (firstFile as any).webkitRelativePath?.split('/') || [];
      const folderName = pathParts.length > 1 ? pathParts[0] : null;
      
      const tifFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.tif'));
      const fileCount = tifFiles.length;

      if (!folderName) {
        toast({ title: "Invalid Selection", description: "Please select a folder, not an individual file.", variant: "destructive" });
        setScanState(prev => ({ ...prev, folderName: null, fileCount: null }));
      } else {
        setScanState(prev => ({ ...prev, folderName, fileCount }));
      }
    } else {
        setScanState(prev => ({ ...prev, folderName: null, fileCount: null }));
    }
  };

  const handleConfirmScan = () => {
    if (scanState.book) {
      handleBookAction(scanState.book.id, scanState.book.status, scanState.fileCount ?? 0);
      closeScanningDialog();
    }
  };

  const closeScanningDialog = () => {
    setScanState({ open: false, book: null, folderName: null, fileCount: null });
  }

  const isScanFolderMatch = scanState.book?.name === scanState.folderName;

  const renderBookRow = (item: EnrichedBook) => {
    const isScanningStage = stage === 'scanning';

    return (
        <TableRow key={item.id}>
        <TableCell className="font-medium">
            <Link href={`/books/${item.id}`} className="hover:underline">{item.name}</Link>
        </TableCell>
        <TableCell>{item.projectName}</TableCell>
        <TableCell className="hidden md:table-cell">{item.clientName}</TableCell>
        <TableCell>
            <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
        </TableCell>
        {(actionButtonLabel) && (
            <TableCell>
                {isScanningStage ? (
                    <Button size="sm" onClick={() => setScanState({ open: true, book: item, folderName: null, fileCount: null })}>
                        {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                        {actionButtonLabel}
                    </Button>
                ) : (
                    <Button size="sm" onClick={() => handleGenericAction(item)}>
                        {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                        {actionButtonLabel}
                    </Button>
                )}
            </TableCell>
        )}
        </TableRow>
    )
  }
  
  const renderDocumentRow = (item: AppDocument) => (
     <TableRow key={item.id}>
      <TableCell className="font-medium">
          <Link href={`/documents/${item.id}`} className="hover:underline">{item.name}</Link>
      </TableCell>
      <TableCell>{item.client}</TableCell>
      <TableCell className="hidden md:table-cell">{item.type}</TableCell>
      <TableCell>
        <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
      </TableCell>
       <TableCell className="hidden md:table-cell">{item.lastUpdated}</TableCell>
      {(actionButtonLabel || stage === 'quality-control') && (
        <TableCell>
          <div className="flex gap-2">
            {stage === 'quality-control' ? (
                <>
                    <Button size="sm" variant="outline" onClick={() => handleQCAction(item, 'Approved')}><ThumbsUp className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleQCAction(item, 'Rejected')}><ThumbsDown className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleQCAction(item, 'Sent Back')}><Undo2 className="h-4 w-4" /></Button>
                </>
            ) : actionButtonLabel ? (
                <Button size="sm" onClick={() => handleGenericAction(item)}>
                    {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                    {actionButtonLabel}
                </Button>
            ) : null}
          </div>
        </TableCell>
      )}
    </TableRow>
  )


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayItems.length > 0 ? (
          <Table>
            <TableHeader>
              {dataType === 'book' ? (
                <TableRow>
                  <TableHead>Book Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="hidden md:table-cell">Client</TableHead>
                  <TableHead>Status</TableHead>
                  {(actionButtonLabel) && <TableHead>Actions</TableHead>}
                </TableRow>
              ) : (
                 <TableRow>
                  <TableHead>Document Name</TableHead>
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
              {displayItems.map((item) => (
                dataType === 'book'
                  ? renderBookRow(item as EnrichedBook)
                  : renderDocumentRow(item as AppDocument)
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
          Showing <strong>{displayItems.length}</strong> items
        </div>
      </CardFooter>
    </Card>

    <Dialog open={scanState.open} onOpenChange={closeScanningDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Scanning for "{scanState.book?.name}"</DialogTitle>
          <DialogDescription>
            Select the folder containing the scanned pages. The folder name must match the book name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="folder-upload">Select Scanned Folder</Label>
              <div className="flex items-center gap-2">
                <Input id="folder-upload" type="file" onChange={handleDirectorySelect} webkitdirectory="true" directory="true" className="hidden" accept=".tif" />
                <Button asChild variant="outline">
                    <label htmlFor="folder-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Directory
                    </label>
                </Button>
                {scanState.folderName && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {isScanFolderMatch ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                        <span>{scanState.folderName}</span>
                    </div>
                )}
              </div>
          </div>
          {scanState.folderName && !isScanFolderMatch && (
              <p className="text-sm text-destructive">
                  Folder name does not match book name. Expected: "{scanState.book?.name}".
              </p>
          )}
          {scanState.book && scanState.fileCount !== null && scanState.fileCount !== scanState.book.expectedDocuments && (
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>File Count Mismatch</AlertTitle>
              <AlertDescription>
                Found {scanState.fileCount} .tif files, but expected {scanState.book.expectedDocuments}.
                Proceeding will only generate {scanState.fileCount} pages.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeScanningDialog}>Cancel</Button>
          <Button onClick={handleConfirmScan} disabled={!isScanFolderMatch}>
            Confirm Scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
