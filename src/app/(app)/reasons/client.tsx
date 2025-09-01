
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Client, type RejectionTag } from "@/lib/data"
import { ReasonForm, type ReasonFormValues } from "./reason-form"
import { useAppContext } from "@/context/workflow-context"
import { useToast } from "@/hooks/use-toast"

export default function RejectionReasonsClient() {
  const { clients, rejectionTags, addRejectionTag, updateRejectionTag, deleteRejectionTag, currentUser } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: RejectionTag }>({ open: false, type: 'new' })
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; data?: RejectionTag }>({ open: false });
  const { toast } = useToast();

  const displayedTags = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') {
      return rejectionTags.map(tag => ({
        ...tag,
        clientName: clients.find(c => c.id === tag.clientId)?.name || 'Unknown'
      }));
    }
    if (currentUser.clientId) {
      return rejectionTags.filter(tag => tag.clientId === currentUser.clientId);
    }
    return [];
  }, [rejectionTags, currentUser, clients]);

  const openDialog = (type: 'new' | 'edit', data?: RejectionTag) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: 'new', data: undefined })
  }

  const handleSave = (values: ReasonFormValues) => {
    const { clientId, ...tagData } = values;

    if (dialogState.type === 'new') {
      const finalClientId = currentUser?.role === 'Admin' ? clientId : currentUser?.clientId;

      if (!finalClientId) {
        toast({title: "Cliente Não Especificado", description: "Um administrador deve selecionar um cliente.", variant: "destructive"});
        return;
      }
      addRejectionTag(tagData, finalClientId);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateRejectionTag(dialogState.data.id, tagData);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!deleteDialogState.data) return;
    deleteRejectionTag(deleteDialogState.data.id);
    setDeleteDialogState({ open: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Razões de Rejeição</h1>
          <p className="text-muted-foreground">Gerir tags personalizadas para rejeitar documentos.</p>
        </div>
        <Button onClick={() => openDialog('new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Razão
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rótulo</TableHead>
                <TableHead>Descrição</TableHead>
                {currentUser?.role === 'Admin' && <TableHead>Cliente</TableHead>}
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTags.length > 0 ? displayedTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium">{tag.label}</TableCell>
                  <TableCell>{tag.description}</TableCell>
                  {currentUser?.role === 'Admin' && <TableCell>{(tag as any).clientName}</TableCell>}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openDialog('edit', tag)}>
                           <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, data: tag })} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={currentUser?.role === 'Admin' ? 4 : 3} className="h-24 text-center">
                    Nenhuma razão de rejeição definida. Adicione uma para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Criar Nova Razão' : 'Editar Razão'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Adicione uma nova tag de rejeição para um cliente usar.' : `Editar razão: ${dialogState.data?.label}`}
            </DialogDescription>
          </DialogHeader>
          <ReasonForm 
            reason={dialogState.data} 
            onSave={handleSave} 
            onCancel={closeDialog}
            clients={clients}
            isEditing={dialogState.type === 'edit'}
            showClientSelector={currentUser?.role === 'Admin'}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogState.open} onOpenChange={() => setDeleteDialogState({ open: false, data: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá eliminar permanentemente a razão <span className="font-bold">{deleteDialogState.data?.label}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogState({ open: false, data: undefined })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
