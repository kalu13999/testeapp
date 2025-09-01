
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Package, Send, Users, Percent, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"

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
  
  const getAssignableUsers = (batch: (DeliveryBatch & { books: EnrichedBook[] })) => {
    if (!batch || batch.books.length === 0) return [];
    const batchClientId = batch.books[0].clientId;
    return users.filter(u => u.clientId !== null && u.clientId === batchClientId);
  };

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
  
  const assignableUsersInDialog = dialogState.state.batch ? getAssignableUsers(dialogState.state.batch) : [];


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Gerir Entregas</CardTitle>
          <CardDescription>Distribuir tarefas de validação para lotes de entrega recebidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de Entrega</TableHead>
                <TableHead>Livros Prontos</TableHead>
                <TableHead>Páginas Totais</TableHead>
                <TableHead className="text-right">Ação</TableHead>
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
                        <Button size="sm" onClick={() => openDistributionDialog(batch)}>Distribuir Amostra</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhum lote de entrega está pronto para distribuição.
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
              <DialogTitle>Distribuir Amostra para Lote de {new Date(dialogState.state.batch.creationDate).toLocaleDateString()}</DialogTitle>
              <DialogDescription>Selecione um tamanho de amostra e atribua operadores para validação.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sample-percentage" className="flex items-center gap-2"><Percent className="h-4 w-4"/> Tamanho da Amostra</Label>
                        <Select 
                            value={String(dialogState.state.percentage)} 
                            onValueChange={(val) => setDialogState(p => ({...p, state: {...p.state, percentage: Number(val)}}))}
                        >
                            <SelectTrigger id="sample-percentage"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map(p => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Esta seleção irá escolher <strong>{dialogState.state.sampleBookIds.length}</strong> de <strong>{dialogState.state.batch.books.length}</strong> livros aleatoriamente.
                        </p>
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="operators" className="flex items-center gap-2"><Users className="h-4 w-4"/> Atribuir a</Label>
                         <ScrollArea className="h-48 rounded-md border p-4">
                            {assignableUsersInDialog.map(user => (
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
                    <Label className="flex items-center gap-2"><Package className="h-4 w-4"/> Livros na Amostra</Label>
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
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={handleDistribution} disabled={dialogState.state.sampleBookIds.length === 0 || dialogState.state.selectedUserIds.length === 0}>
                <Send className="mr-2 h-4 w-4"/> Distribuir Tarefas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
