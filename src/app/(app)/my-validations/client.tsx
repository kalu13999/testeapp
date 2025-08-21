
"use client"

import * as React from "react"
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { ThumbsDown, ThumbsUp, Tag, User } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AppDocument, EnrichedBook, RejectionTag } from "@/context/workflow-context";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ValidationTask = {
  item: {
    id: string;
    deliveryId: string;
  };
  book: EnrichedBook;
  assignee: {
    id: string;
    name: string;
  } | null;
};

export default function MyValidationsClient() {
  const { 
    deliveryBatches, deliveryBatchItems, books, currentUser, users, permissions,
    setProvisionalDeliveryStatus, tagPageForRejection, rejectionTags, selectedProjectId
  } = useAppContext();

  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBookInfo, setCurrentBookInfo] = React.useState<{ bookId: string; name: string; deliveryItemId: string } | null>(null);

  const canViewAll = React.useMemo(() => {
    if (!currentUser) return false;
    const userPermissions = permissions[currentUser.role] || [];
    return userPermissions.includes('/client/view-all-validations');
  }, [currentUser, permissions]);

  const myTasks = React.useMemo((): ValidationTask[] => {
    if (!currentUser?.clientId) return [];
    
    // 1. Get all batches currently in validation for the user's company
    const clientBookIds = new Set(books.filter(b => b.clientId === currentUser.clientId).map(b => b.id));
    const relevantBatchIds = new Set<string>();
    deliveryBatchItems.forEach(item => {
        if (clientBookIds.has(item.bookId)) {
            const batch = deliveryBatches.find(b => b.id === item.deliveryId);
            if(batch && batch.status === 'Validating') {
                relevantBatchIds.add(batch.id);
            }
        }
    });

    // 2. Get all pending items from those batches
    let pendingItems = deliveryBatchItems.filter(item => 
      relevantBatchIds.has(item.deliveryId) && item.status === 'pending'
    );

    // 3. Filter items based on permission
    if (!canViewAll) {
      pendingItems = pendingItems.filter(item => item.userId === currentUser.id);
    }
    
    // 4. Enrich with book and user data
    let tasks = pendingItems.map(item => {
        const book = books.find(b => b.id === item.bookId);
        if (!book) return null;
        
        const assignee = item.userId ? users.find(u => u.id === item.userId) : null;
        
        return {
            item: { id: item.id, deliveryId: item.deliveryId },
            book,
            assignee: assignee ? { id: assignee.id, name: assignee.name } : null
        };
    }).filter((t): t is ValidationTask => !!t);

    // 5. Filter by selected project
    if (selectedProjectId) {
      tasks = tasks.filter(t => t.book.projectId === selectedProjectId);
    }

    return tasks;

  }, [deliveryBatches, deliveryBatchItems, books, users, currentUser, canViewAll, selectedProjectId]);


  const handleRejectSubmit = () => {
    if (!currentBookInfo) return;
    setProvisionalDeliveryStatus(currentBookInfo.deliveryItemId, currentBookInfo.bookId, 'rejected', rejectionComment);
    setRejectionComment("");
    setCurrentBookInfo(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">My Validations</CardTitle>
          <CardDescription>Review and approve or reject the books assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Priority</TableHead>
                    {canViewAll && <TableHead>Assigned To</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {myTasks.length > 0 ? myTasks.map(task => (
                    <TableRow key={task.item.id}>
                        <TableCell className="font-medium">{task.book.name}</TableCell>
                        <TableCell>{task.book.projectName}</TableCell>
                        <TableCell><Badge variant="outline">{task.book.priority}</Badge></TableCell>
                        {canViewAll && <TableCell>{task.assignee?.name || 'Unassigned'}</TableCell>}
                        <TableCell className="text-right">
                           <div className="flex justify-end gap-2">
                            <Button size="sm" variant="destructive" onClick={() => setCurrentBookInfo({bookId: task.book.id, name: task.book.name, deliveryItemId: task.item.id})}>
                                <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                            </Button>
                            <Button size="sm" onClick={() => setProvisionalDeliveryStatus(task.item.id, task.book.id, 'approved')}>
                                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={canViewAll ? 5 : 4} className="h-24 text-center text-muted-foreground">
                            You have no pending validation tasks.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={!!currentBookInfo} onOpenChange={(open) => !open && setCurrentBookInfo(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogDescription>
                    Provide a reason for rejecting the book "{currentBookInfo?.name}". This will be sent to the internal team for correction.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <Label htmlFor="rejection-comment">Comment</Label>
                <Textarea 
                    id="rejection-comment"
                    placeholder="e.g., Page 5 is blurry, please re-scan."
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCurrentBookInfo(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                    Submit Rejection
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
