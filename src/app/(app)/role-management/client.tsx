
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
import { ALL_PERMISSIONS } from './permissions';
import { ScrollArea } from '@/components/ui/scroll-area';

const permissionDescriptions: { [key: string]: string } = {
  '/dashboard': 'Allows user to view the main project dashboard.',
  '/profile': 'Allows user to view and edit their own profile.',
  '/settings': 'Grants access to global application settings. (Admin recommended)',
  '/projects': 'Allows user to view and manage the list of projects.',
  '/projects/[id]': 'Allows user to view the detailed page for a single project.',
  '/clients': 'Allows user to view and manage the list of company clients.',
  '/users': 'Grants access to create, edit, and manage all user accounts.',
  '/book-management': 'Allows user to add, edit, delete, and import books for a project.',
  '/role-management': 'Grants access to define roles and manage their permissions.',
  '/admin/status-override': 'Allows manual override of any book\'s status. (High-level permission)',
  '/admin/default-projects': 'Allows setting a default login project for other users.',
  '/admin/reassign-user': 'Grants access to reassign a task from one user to another.',
  '/documents': 'Allows viewing a master list of all books across all accessible projects.',
  '/books/[id]': 'Allows viewing the detailed page for a single book, including its pages.',
  '/documents/[id]': 'Allows viewing the detailed page for a single document (page scan).',
  '/workflow/view-all': 'Allows a user to see all tasks in a queue, not just their own. Essential for managers.',
  '/workflow/pending-shipment': 'Access the queue of books waiting to be shipped by the client.',
  '/workflow/confirm-reception': 'Access the queue to confirm physical arrival of books from clients.',
  '/workflow/assign-scanner': 'Access the queue to assign a received book to a scanner.',
  '/workflow/to-scan': 'Access the personal queue of books ready to be scanned.',
  '/workflow/scanning-started': 'Access the personal queue of books currently being scanned.',
  '/workflow/storage': 'Access the queue of scanned books ready for the digital workflow (e.g., indexing).',
  '/workflow/to-indexing': 'Access the personal queue of books ready to be indexed.',
  '/workflow/indexing-started': 'Access the personal queue of books currently being indexed.',
  '/workflow/to-checking': 'Access the personal queue of books ready for quality control.',
  '/workflow/checking-started': 'Access the personal queue of books currently being checked.',
  '/workflow/ready-for-processing': 'Access the queue of books ready for automated scripts (e.g., OCR).',
  '/workflow/in-processing': 'Access the monitoring page for books currently in automated processing.',
  '/workflow/processed': 'Access the queue of books that have finished automated processing.',
  '/workflow/final-quality-control': 'Access the queue for final quality review before client delivery.',
  '/workflow/delivery': 'Access the queue to prepare and send finalized books to the client.',
  '/workflow/client-rejections': 'Access the queue of books rejected by the client that require correction.',
  '/workflow/corrected': 'Access the queue of corrected books ready for re-submission.',
  '/finalized': 'Access the queue of client-approved books waiting for final archival.',
  '/archive': 'Access the view of all fully archived and completed books.',
  '/shipments': 'Client-facing page to prepare and mark books as shipped.',
  '/pending-deliveries': 'Client-facing page to review and approve/reject delivered books.',
  '/validated-history': 'Client-facing page to view the history of all their validated batches.',
  '/reasons': 'Allows management of custom rejection reasons for clients.'
};

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
            <h1 className="font-headline text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground">
              Define user roles and manage their page access permissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsInfoModalOpen(true)}>
                <Info className="h-4 w-4" />
            </Button>
            <Button onClick={() => openDialog('new')}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Role
            </Button>
          </div>
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
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
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

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>About Role Management & Permissions</DialogTitle>
                <DialogDescription>
                    Use roles to precisely control what each user can see and do within FlowVault.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3 text-sm text-muted-foreground">
                <p>
                    A <strong className="text-foreground">Role</strong> is a collection of permissions that you can assign to a user. When you create or edit a role, you are choosing which pages and features users with that role can access.
                </p>
                <p>
                    The wildcard permission (<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">*</code>) grants access to all pages and features and should be reserved for <strong className="text-foreground">Admin</strong> roles only.
                </p>
                
                <h4 className="font-medium text-foreground pt-3 border-t">Permission Details:</h4>
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
                                    {permissionDescriptions[permission.id] || `Grants access to the ${permission.label.toLowerCase()} page.`}
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
