
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
import { GanttChartSquare, MoreHorizontal, Edit, Trash2, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ALL_PERMISSIONS } from './permissions';

export default function RoleManagementClient() {
  const { roles, permissions, addRole, updateRole, deleteRole } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit'; data?: RoleData }>({ open: false, type: 'new' });
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ open: boolean; role?: string }>({ open: false });

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
            <h1 className="font-headline text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground">
              Define user roles and manage their page access permissions.
            </p>
          </div>
          <Button onClick={() => openDialog('new')}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Role
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Roles & Permissions</CardTitle>
            <CardDescription>
              Add or edit roles to control access to different parts of the application.
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
                        <p className="text-sm text-muted-foreground text-left">Full system access</p>
                      </div>
                    </div>
                </AccordionTrigger>
                 <AccordionContent className="p-4">
                    <div className="border rounded-md p-4 bg-muted/30">
                      <h4 className="font-semibold mb-2">Allowed Page Routes:</h4>
                      <Badge>All Permissions (*)</Badge>
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
                                {`${rolePermissions.length} permissions granted`}
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
                                <DropdownMenuItem onSelect={() => openDialog('edit', role)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDeleteDialogState({ open: true, role })} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <AccordionContent className="p-4">
                      <div className="border rounded-md p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2">Allowed Page Routes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {rolePermissions.length > 0 ? (
                              rolePermissions.map(permission => (
                                <Badge variant="secondary" key={permission} className="font-mono text-xs">
                                  {permission}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No permissions assigned.</p>
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
            <DialogTitle>{dialogState.type === 'new' ? 'Create New Role' : 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Define a new role and assign its permissions.' : `Editing permissions for role: ${dialogState.data?.name}`}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role <span className="font-bold">{deleteDialogState.role}</span>.
              Users with this role will lose their specific permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogState({ open: false })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteDialogState.role!)}>Delete Role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
