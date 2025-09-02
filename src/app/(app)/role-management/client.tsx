
"use client"

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppContext } from '@/context/workflow-context';
import { GanttChartSquare, MoreHorizontal, Edit, Trash2, PlusCircle, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { RoleForm } from './role-form';
import type { RoleData } from './role-form';
import { ALL_PERMISSIONS, permissionDescriptions } from '@/lib/permissions';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function RoleManagementClient() {
  const { roles, permissions, addRole, updateRole, deleteRole } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: RoleData }>({ open: false, type: 'new' });
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; role?: string }>({ open: false });
  const [isInfoModalOpen, setIsInfoModalOpen] = React.useState(false);

  // Exclude 'System' and 'Admin' roles from being edited or deleted
  const coreRoles = ['System', 'Admin'];
  const displayRoles = roles.filter(role => !coreRoles.includes(role));

  const openDialog = (type: 'new' | 'edit', roleName?: string) => {
    if (type === 'edit' && roleName) {
      setDialogState({ open: true, type, data: { name: roleName, permissions: permissions[roleName] || [] } });
    } else {
      setDialogState({ open: true, type, data: { name: '', permissions: [] } });
    }
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: 'new', data: undefined });
  }

  const handleDelete = (roleName: string) => {
    deleteRole(roleName);
    setDeleteDialogState({ open: false });
  }

  const handleSave = (values: RoleData) => {
    if (dialogState.type === 'new') {
      addRole(values.name, values.permissions);
    } else if (dialogState.data) {
      // Note: We don't support renaming roles as it's a key.
      // We only update permissions.
      updateRole(dialogState.data.name, values.permissions);
    }
    closeDialog();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Gestão de Perfis</h1>
            <p className="text-muted-foreground">
              Configure os perfis dos utilizadores e administre as permissões de acesso às páginas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsInfoModalOpen(true)}>
                <Info className="h-4 w-4" />
            </Button>
            <Button onClick={() => openDialog('new')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Perfil
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfis do Sistema & Permissões</CardTitle>
            <CardDescription>
              Adicione ou edite perfis para controlar o acesso a diferentes partes da aplicação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {/* Display non-editable Admin role first */}
              <AccordionItem value="Admin">
                <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                    <div className="flex items-center gap-3">
                      <GanttChartSquare className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-base">Admin</p>
                        <p className="text-sm text-muted-foreground text-left">Acesso total ao sistema</p>
                      </div>
                    </div>
                </AccordionTrigger>
                 <AccordionContent className="p-4">
                    <div className="border rounded-md p-4 bg-muted/30">
                      <h4 className="font-semibold mb-2">Rotas de Página Permitidas:</h4>
                      <Badge>Todas as Permissões (*)</Badge>
                    </div>
                  </AccordionContent>
              </AccordionItem>
              
              {displayRoles.map(role => {
                const rolePermissions = permissions[role] || [];
                return (
                  <AccordionItem value={role} key={role}>
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md group">
                      <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3">
                          <GanttChartSquare className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold text-base">{role}</p>
                            <p className="text-sm text-muted-foreground text-left">
                                {`${rolePermissions.length} permissões concedidas`}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="pr-4">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => openDialog('edit', role)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, role })} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <AccordionContent className="p-4">
                      <div className="border rounded-md p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2">Rotas de Página Permitidas:</h4>
                          <div className="flex flex-wrap gap-2">
                            {rolePermissions.length > 0 ? (
                              rolePermissions.map(permission => (
                                <Badge variant="secondary" key={permission} className="font-mono text-xs">
                                  {permission}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Sem permissões atribuídas.</p>
                            )}
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>

       <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Criar Novo Perfil' : 'Editar Perfil'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' 
              ? 'Crie um novo perfil e atribua as suas permissões.' 
              : `A editar permissões do perfil: ${dialogState.data?.name}`}  
            </DialogDescription>
          </DialogHeader>
          <RoleForm 
            initialData={dialogState.data}
            allPermissions={ALL_PERMISSIONS}
            onSave={handleSave}
            onCancel={closeDialog}
            isEditing={dialogState.type === 'edit'}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogState.open} onOpenChange={(open) => !open && setDeleteDialogState({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá eliminar permanentemente o perfil <span className="font-bold">{deleteDialogState.role}</span>.
              Os utilizadores com este perfil perderão as suas permissões específicas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogState({ open: false })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteDialogState.role!)}>Eliminar Perfil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Sobre Gestão de Perfis e Permissões</DialogTitle>
                <DialogDescription>
                    Utilize perfis para controlar com precisão o que cada utilizador pode ver e fazer dentro do FlowVault.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3 text-sm text-muted-foreground">
                <p>
                    Um <strong className="text-foreground">Perfil</strong> é um conjunto de permissões que pode atribuir a um utilizador. Ao criar ou editar um perfil, está a definir a que páginas e funcionalidades os utilizadores com esse perfil podem aceder.
                </p>
                <p>
                    A permissão universal (<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">*</code>) concede acesso a todas as páginas e funcionalidades e deve ser reservada apenas para perfis de <strong className="text-foreground">Administrador</strong>.
                </p>

                <h4 className="font-medium text-foreground pt-3 border-t">Detalhes da Permissão:</h4>
                <ScrollArea className="h-[50vh] pr-4">
                    <div className="space-y-5">
                        {ALL_PERMISSIONS.map(group => (
                        <div key={group.group}>
                            <h5 className="font-semibold text-foreground mb-3">{group.group}</h5>
                            <div className="space-y-4">
                                {group.permissions.map(permission => (
                                <div key={permission.id} className="pl-2">
                                    <p className="font-medium text-foreground">{permission.label}</p>
                                    <p className="text-xs text-muted-foreground pl-3 border-l-2 ml-1 mt-1">
                                    {permissionDescriptions[permission.id] || `Concede acesso à página ${permission.label.toLowerCase()}.`}
                                    </p>
                                </div>
                                ))}
                            </div>
                        </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsInfoModalOpen(false)}>Got it</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
