
"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Package, Send, Users, Percent, Checkbox, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { type DeliveryBatch, type EnrichedBook, type User } from "@/lib/data"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DistributionState {
  batch: (DeliveryBatch & { books: EnrichedBook[] }) | null,
  percentage: number;
  selectedUserIds: string[];
  sampleBookIds: string[];
}

export default function ManageDeliveriesClient() {
  const { deliveryBatches, deliveryBatchItems, books, users, distributeValidationSample, currentUser } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean, state: DistributionState }>({ open: false, state: { batch: null, percentage: 10, selectedUserIds: [], sampleBookIds: [] } });

  const batchesToDistribute = React.useMemo(() => {
    return deliveryBatches
        .filter(batch => batch.status === 'Ready')
        .map(batch => {
            const itemsInBatch = deliveryBatchItems.filter(item => item.deliveryId === batch.id && !item.user_id);
            const booksInBatch = books.filter(book => itemsInBatch.some(i => i.bookId === book.id));
            return {
                ...batch,
                books: booksInBatch
            }
        })
        .filter(batch => batch.books.length > 0)
        .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
  }, [deliveryBatches, deliveryBatchItems, books]);
  
  const clientOperators = React.useMemo(() => {
    return users.filter(u => u.role === 'Client Operator' && u.clientId === currentUser?.clientId);
  }, [users, currentUser]);

  const openDistributionDialog = (batch: DeliveryBatch & { books: EnrichedBook[] }) => {
    setDialogState({
      open: true,
      state: { batch, percentage: 10, selectedUserIds: [], sampleBookIds: [] }
    });
  }

  const closeDialog = () => {
    setDialogState({ open: false, state: { batch: null, percentage: 10, selectedUserIds: [], sampleBookIds: [] } });
  }

  const handleDistribution = () => {
    const { batch, sampleBookIds, selectedUserIds } = dialogState.state;
    if (!batch || sampleBookIds.length === 0 || selectedUserIds.length === 0) return;

    const assignments = sampleBookIds.map((bookId, index) => {
        const deliveryItemId = deliveryBatchItems.find(item => item.bookId === bookId && item.deliveryId === batch.id)?.id;
        const userId = selectedUserIds[index % selectedUserIds.length];
        return { itemId: deliveryItemId!, userId };
    }).filter(a => a.itemId);
    
    distributeValidationSample(batch.id, assignments);
    closeDialog();
  };

  const calculateSample = (books: EnrichedBook[], percentage: number): string[] => {
    const count = Math.ceil(books.length * (percentage / 100));
    return books.map(b => b.id).sort(() => 0.5 - Math.random()).slice(0, count);
  }

  React.useEffect(() => {
    if (dialogState.open && dialogState.state.batch) {
        const newSample = calculateSample(dialogState.state.batch.books, dialogState.state.percentage);
        setDialogState(prev => ({ ...prev, state: { ...prev.state, sampleBookIds: newSample }}));
    }
  }, [dialogState.open, dialogState.state.percentage, dialogState.state.batch]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Manage Deliveries</CardTitle>
          <CardDescription>Distribute validation tasks for received delivery batches.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Books Ready</TableHead>
                <TableHead>Total Pages</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchesToDistribute.length > 0 ? (
                batchesToDistribute.map(batch => {
                  const totalPages = batch.books.reduce((sum, book) => sum + book.expectedDocuments, 0);
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{new Date(batch.creationDate).toLocaleDateString()}</TableCell>
                      <TableCell>{batch.books.length}</TableCell>
                      <TableCell>{totalPages.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openDistributionDialog(batch)}>Distribute Sample</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No delivery batches are ready for distribution.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {dialogState.state.batch && (
        <Dialog open={dialogState.open} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Distribute Sample for Batch from {new Date(dialogState.state.batch.creationDate).toLocaleDateString()}</DialogTitle>
              <DialogDescription>Select a sample size and assign operators for validation.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sample-percentage" className="flex items-center gap-2"><Percent className="h-4 w-4"/> Sample Size</Label>
                        <Select 
                            value={String(dialogState.state.percentage)} 
                            onValueChange={(val) => setDialogState(p => ({...p, state: {...p.state, percentage: Number(val)}}))}
                        >
                            <SelectTrigger id="sample-percentage"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50, 75, 100].map(p => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            This will select <strong>{dialogState.state.sampleBookIds.length}</strong> of <strong>{dialogState.state.batch.books.length}</strong> books randomly.
                        </p>
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="operators" className="flex items-center gap-2"><Users className="h-4 w-4"/> Assign To</Label>
                         <ScrollArea className="h-48 rounded-md border p-4">
                            {clientOperators.map(user => (
                                <div key={user.id} className="flex items-center space-x-2 mb-2">
                                    <Checkbox 
                                        id={`user-${user.id}`}
                                        checked={dialogState.state.selectedUserIds.includes(user.id)}
                                        onCheckedChange={(checked) => setDialogState(p => ({...p, state: {
                                            ...p.state,
                                            selectedUserIds: checked ? [...p.state.selectedUserIds, user.id] : p.state.selectedUserIds.filter(id => id !== user.id)
                                        }}))}
                                    />
                                    <Label htmlFor={`user-${user.id}`} className="font-normal">{user.name}</Label>
                                </div>
                            ))}
                         </ScrollArea>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Package className="h-4 w-4"/> Books in Sample</Label>
                    <ScrollArea className="h-[23rem] rounded-md border">
                        <div className="p-4 space-y-2 text-sm">
                            {dialogState.state.sampleBookIds.map(bookId => {
                                const book = dialogState.state.batch?.books.find(b => b.id === bookId);
                                return <p key={bookId} className="truncate">{book?.name}</p>
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleDistribution} disabled={dialogState.state.sampleBookIds.length === 0 || dialogState.state.selectedUserIds.length === 0}>
                <Send className="mr-2 h-4 w-4"/> Distribute Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
