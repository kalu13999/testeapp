
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppContext } from "@/context/workflow-context"
import { type Project, type Storage, type ProjectStorage } from "@/lib/data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Edit } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
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
import { Card } from "@/components/ui/card"


interface ProjectStorageFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

type FormData = Omit<ProjectStorage, 'projectId'>

const defaultFormData: FormData = {
  storageId: 0,
  peso: 1,
  minimo_diario_fixo: 0,
  percentual_minimo_diario: 0,
  descricao: '',
  obs: '',
}

export function ProjectStorageForm({ open, onOpenChange, project }: ProjectStorageFormProps) {
  const { storages, projectStorages, addProjectStorage, updateProjectStorage, deleteProjectStorage } = useAppContext();
  const [formData, setFormData] = React.useState<FormData>(defaultFormData);
  const [editingStorageId, setEditingStorageId] = React.useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState<{ open: boolean, association?: ProjectStorage & { storageName?: string }}>({ open: false });

  const { toast } = useToast();

  const currentProjectStorages = React.useMemo(() => {
    return projectStorages
      .filter(ps => ps.projectId === project.id)
      .map(ps => {
        const storage = storages.find(s => s.id === ps.storageId);
        return { ...ps, storageName: storage?.nome || 'Unknown' }
      })
  }, [projectStorages, project, storages]);

  const availableStorages = React.useMemo(() => {
    const associatedIds = new Set(currentProjectStorages.map(ps => ps.storageId));
    return storages.filter(s => !associatedIds.has(s.id));
  }, [storages, currentProjectStorages]);
  
  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingStorageId(null);
  }

  const handleEditClick = (association: ProjectStorage) => {
    setEditingStorageId(association.storageId);
    setFormData(association);
  }

  const handleSave = () => {
    if (editingStorageId) { // Update
      updateProjectStorage({ ...formData, projectId: project.id });
      toast({ title: "Associação Atualizada" });
    } else { // Create
      if (!formData.storageId) {
        toast({ title: "Nenhum Armazenamento Selecionado", description: "Por favor, selecione um local de armazenamento.", variant: "destructive" });
        return;
      }
      addProjectStorage({ ...formData, projectId: project.id });
      toast({ title: "Associação Adicionada" });
    }
    resetForm();
  }

  const handleDeleteClick = (association: ProjectStorage & { storageName?: string }) => {
    setDeleteConfirmation({ open: true, association });
  }
  
  const handleDeleteConfirm = () => {
    if(deleteConfirmation.association) {
        deleteProjectStorage(project.id, deleteConfirmation.association.storageId);
        toast({ title: "Associação Removida", variant: 'destructive' });
        setDeleteConfirmation({ open: false });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gerir Armazenamentos para: {project.name}</DialogTitle>
            <DialogDescription>
              Associe armazenamentos a este projeto e defina as regras de distribuição específicas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <div className="md:col-span-1 space-y-4 p-4 border rounded-md">
                <h3 className="font-semibold">{editingStorageId ? "Editar Associação" : "Adicionar Nova Associação"}</h3>
                <div className="space-y-2">
                    <Label htmlFor="storage-select">Armazenamento</Label>
                    <Select 
                      value={formData.storageId.toString()}
                      onValueChange={(value) => setFormData(fd => ({...fd, storageId: Number(value)}))}
                      disabled={!!editingStorageId}
                    >
                        <SelectTrigger id="storage-select">
                            <SelectValue placeholder="Select a storage..." />
                        </SelectTrigger>
                        <SelectContent>
                            {editingStorageId 
                              ? <SelectItem value={editingStorageId.toString()}>{currentProjectStorages.find(ps => ps.storageId === editingStorageId)?.storageName}</SelectItem>
                              : availableStorages.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.nome}</SelectItem>)
                            }
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="peso">Peso de Distribuição</Label>
                    <Input id="peso" type="number" value={formData.peso} onChange={e => setFormData(fd => ({...fd, peso: Number(e.target.value)}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="minimo-fixo">Mínimo Fixo Diário (Páginas)</Label>
                    <Input id="minimo-fixo" type="number" value={formData.minimo_diario_fixo} onChange={e => setFormData(fd => ({...fd, minimo_diario_fixo: Number(e.target.value)}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="minimo-percent">Mínimo Percentual Diário (%)</Label>
                    <Input id="minimo-percent" type="number" value={formData.percentual_minimo_diario} onChange={e => setFormData(fd => ({...fd, percentual_minimo_diario: Number(e.target.value)}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea id="descricao" value={formData.descricao || ''} onChange={e => setFormData(fd => ({...fd, descricao: e.target.value}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="obs">Observações</Label>
                    <Textarea id="obs" value={formData.obs || ''} onChange={e => setFormData(fd => ({...fd, obs: e.target.value}))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="w-full">{editingStorageId ? "Atualizar" : "Adicionar"}</Button>
                  {editingStorageId && <Button variant="outline" onClick={resetForm} className="w-full">Cancelar Edição</Button>}
                </div>
            </div>
            <div className="md:col-span-2">
                <h3 className="font-semibold mb-2">Associações Atuais</h3>
                 <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Armazenamento</TableHead>
                                <TableHead className="text-center">Peso</TableHead>
                                <TableHead className="text-center">Mínimo Fixo</TableHead>
                                <TableHead className="text-center">% Mínimo</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentProjectStorages.length > 0 ? currentProjectStorages.map(assoc => (
                                <TableRow key={assoc.storageId}>
                                    <TableCell className="font-medium">{assoc.storageName}</TableCell>
                                    <TableCell className="text-center">{assoc.peso}</TableCell>
                                    <TableCell className="text-center">{assoc.minimo_diario_fixo}</TableCell>
                                    <TableCell className="text-center">{assoc.percentual_minimo_diario}%</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(assoc)}><Edit className="h-4 w-4" /></Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(assoc)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Nenhum armazenamento associado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteConfirmation.open} onOpenChange={(open) => !open && setDeleteConfirmation({ open: false, association: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Associação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza de que pretende remover a associação ao armazenamento <span className="font-bold">{deleteConfirmation.association?.storageName}</span> para este projeto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
