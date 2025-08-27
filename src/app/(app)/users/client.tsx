
"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Info, ArrowUp, ArrowDown, ChevronsUpDown, Download } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { type User, type Client } from "@/lib/data"
import { UserForm, type UserFormValues } from "./user-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


const ITEMS_PER_PAGE = 10;

export default function UsersClient() {
  const { users, roles, clients, addUser, updateUser, deleteUser, allProjects, toggleUserStatus } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'details' | null; data?: User }>({ open: false, type: null })
  const { toast } = useToast();
  
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);

  const availableRoles = roles.filter(r => r !== 'System').sort();

  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
    setCurrentPage(1);
  };

  const handleSort = (columnId: string, isShift: boolean) => {
    setSorting(currentSorting => {
        const existingSortIndex = currentSorting.findIndex(s => s.id === columnId);

        if (isShift) {
            let newSorting = [...currentSorting];
            if (existingSortIndex > -1) {
                if (newSorting[existingSortIndex].desc) {
                    newSorting.splice(existingSortIndex, 1);
                } else {
                    newSorting[existingSortIndex].desc = true;
                }
            } else {
                newSorting.push({ id: columnId, desc: false });
            }
            return newSorting;
        } else {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) {
                    return [];
                }
                return [{ id: columnId, desc: true }];
            }
            return [{ id: columnId, desc: false }];
        }
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sortIndex = sorting.findIndex(s => s.id === columnId);
    if (sortIndex === -1) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    
    const sort = sorting[sortIndex];
    const icon = sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
    
    return (
        <div className="flex items-center gap-1">
            {icon}
            {sorting.length > 1 && (
                <span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>
            )}
        </div>
    );
  }

  const sortedAndFilteredUsers = React.useMemo(() => {
    let filtered = users;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(user => {
          const userValue = user[columnId as keyof User];
          return String(userValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });


    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof User;
                const valA = a[key];
                const valB = b[key];

                let result = 0;
                if (valA === null || valA === undefined) result = -1;
                else if (valB === null || valB === undefined) result = 1;
                else if (typeof valA === 'number' && typeof valB === 'number') {
                    result = valA - valB;
                } else {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }

                if (result !== 0) {
                    return s.desc ? -result : result;
                }
            }
            return 0;
        });
    }
    return filtered;

  }, [users, columnFilters, sorting]);
  
  const selectedUsers = React.useMemo(() => {
    return sortedAndFilteredUsers.filter(user => selection.includes(user.id));
  }, [sortedAndFilteredUsers, selection]);

  React.useEffect(() => {
    setSelection([]);
  }, [columnFilters, sorting]);


  const totalPages = Math.ceil(sortedAndFilteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = sortedAndFilteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportJSON = (data: User[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data.map(({ password, ...rest }) => rest), null, 2);
    downloadFile(jsonString, 'users_export.json', 'application/json');
    toast({ title: "Export Successful", description: `${data.length} users exported as JSON.` });
  }

  const exportCSV = (data: User[]) => {
    if (data.length === 0) return;
    const headers: (keyof User)[] = ['id', 'name', 'email', 'role', 'phone', 'jobTitle', 'department', 'lastLogin', 'status'];
    const csvContent = [
        headers.join(','),
        ...data.map(user => 
            headers.map(header => {
                let value = user[header] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, 'users_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Export Successful", description: `${data.length} users exported as CSV.` });
  }

  const exportXLSX = (data: User[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data.map(({ password, ...rest }) => rest));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users_export.xlsx");
    toast({ title: "Export Successful", description: `${data.length} users exported as XLSX.` });
  }


  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) { pageNumbers.push(i); }
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) { pageNumbers.push(-1); }
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 2) { end = 3; }
        if (currentPage >= totalPages - 1) { start = totalPages - 2; }
        for (let i = start; i <= end; i++) { pageNumbers.push(i); }
        if (currentPage < totalPages - 2) { pageNumbers.push(-1); }
        pageNumbers.push(totalPages);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          {pageNumbers.map((num, i) => num === -1 ? <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={num}><PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>{num}</PaginationLink></PaginationItem>)}
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const openDialog = (type: 'new' | 'edit' | 'delete' | 'details', data?: User) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
  }

  const handleSave = (values: UserFormValues) => {
    if (dialogState.type === 'new') {
      addUser(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateUser(dialogState.data.id, values);
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!dialogState.data || dialogState.data.role === 'System') return;
    deleteUser(dialogState.data.id);
    closeDialog()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users and their permissions.</p>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(selectedUsers)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(selectedUsers)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(selectedUsers)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Export All ({sortedAndFilteredUsers.length})</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredUsers)} disabled={sortedAndFilteredUsers.length === 0}>Export as XLSX</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredUsers)} disabled={sortedAndFilteredUsers.length === 0}>Export as JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredUsers)} disabled={sortedAndFilteredUsers.length === 0}>Export as CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => openDialog('new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New User
            </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[40px]">
                    <Checkbox
                        onCheckedChange={(checked) => setSelection(checked ? paginatedUsers.map(u => u.id) : [])}
                        checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selection.includes(u.id))}
                        aria-label="Select all on this page"
                    />
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                        Name {getSortIndicator('name')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('username', e.shiftKey)}>
                        Username {getSortIndicator('username')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('email', e.shiftKey)}>
                        Email {getSortIndicator('email')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('role', e.shiftKey)}>
                        Role {getSortIndicator('role')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('department', e.shiftKey)}>
                        Department {getSortIndicator('department')}
                    </div>
                </TableHead>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>
                        Status {getSortIndicator('status')}
                    </div>
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead/>
                <TableHead>
                    <Input
                        placeholder="Filter by name..."
                        value={columnFilters['name'] || ''}
                        onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input
                        placeholder="Filter by username..."
                        value={columnFilters['username'] || ''}
                        onChange={(e) => handleColumnFilterChange('username', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input
                        placeholder="Filter by email..."
                        value={columnFilters['email'] || ''}
                        onChange={(e) => handleColumnFilterChange('email', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input
                        placeholder="Filter by role..."
                        value={columnFilters['role'] || ''}
                        onChange={(e) => handleColumnFilterChange('role', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input
                        placeholder="Filter by department..."
                        value={columnFilters['department'] || ''}
                        onChange={(e) => handleColumnFilterChange('department', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input
                        placeholder="Filter by status..."
                        value={columnFilters['status'] || ''}
                        onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                        className="h-8"
                    />
                </TableHead>
                <TableHead/>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? paginatedUsers.map((user) => (
                <TableRow key={user.id} data-state={selection.includes(user.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selection.includes(user.id)}
                      onCheckedChange={(checked) => {
                        setSelection(
                          checked
                            ? [...selection, user.id]
                            : selection.filter((id) => id !== user.id)
                        )
                      }}
                      aria-label={`Select user ${user.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {user.avatar && <AvatarImage src={user.avatar} alt="User avatar" data-ai-hint="person avatar" />}
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>{user.username || '—'}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                   <TableCell>
                      <Badge variant={user.role === 'Admin' ? "default" : "secondary"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.department || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Switch
                            id={`status-switch-${user.id}`}
                            checked={user.status === 'active'}
                            onCheckedChange={() => toggleUserStatus(user.id)}
                            disabled={user.role === 'System'}
                            aria-label={`Toggle status for ${user.name}`}
                        />
                        <Label htmlFor={`status-switch-${user.id}`} className={cn("capitalize", user.status === 'disabled' && "text-muted-foreground")}>
                            {user.status}
                        </Label>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role !== 'System' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openDialog('details', user)}>
                             <Info className="mr-2 h-4 w-4" /> Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openDialog('edit', user)}>
                             <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                           <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDialog('delete', user)} className="text-destructive">
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No users found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
               {selection.length > 0 ? `${selection.length} of ${sortedAndFilteredUsers.length} user(s) selected.` : `Showing ${paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedUsers.length} of ${sortedAndFilteredUsers.length} users`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Create New User' : 'Edit User'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Add a new user to the system.' : `Editing user: ${dialogState.data?.name}`}
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            user={dialogState.data} 
            roles={availableRoles} 
            clients={clients}
            projects={allProjects}
            onSave={handleSave} 
            onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.open && dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user <span className="font-bold">{dialogState.data?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.open && dialogState.type === 'details'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>{dialogState.data?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Email</p>
              <p className="col-span-2 font-medium">{dialogState.data?.email}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Phone</p>
              <p className="col-span-2 font-medium">{dialogState.data?.phone || '—'}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Role</p>
              <p className="col-span-2 font-medium">{dialogState.data?.role}</p>
            </div>
             {dialogState.data?.clientId && (
                <div className="grid grid-cols-3 items-center gap-x-4">
                    <p className="text-muted-foreground">Client</p>
                    <p className="col-span-2 font-medium">{clients.find(c => c.id === dialogState.data?.clientId)?.name || 'N/A'}</p>
                </div>
             )}
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Job Title</p>
              <p className="col-span-2 font-medium">{dialogState.data?.jobTitle || '—'}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Department</p>
              <p className="col-span-2 font-medium">{dialogState.data?.department || '—'}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Last Login</p>
              <p className="col-span-2 font-medium">{dialogState.data?.lastLogin ? new Date(dialogState.data.lastLogin).toLocaleString() : '—'}</p>
            </div>
             {dialogState.data?.projectIds && dialogState.data.projectIds.length > 0 && (
                <div className="grid grid-cols-3 items-start gap-x-4">
                    <p className="text-muted-foreground">Projects</p>
                     <div className="col-span-2 flex flex-wrap gap-1">
                        {dialogState.data.projectIds.map(id => {
                            const project = allProjects.find(p => p.id === id);
                            return <Badge key={id} variant="secondary">{project?.name || 'Unknown'}</Badge>
                        })}
                    </div>
                </div>
             )}
            {dialogState.data?.info && (
              <div className="grid grid-cols-3 items-start gap-x-4">
                <p className="text-muted-foreground">Additional Info</p>
                <p className="col-span-2 font-medium whitespace-pre-wrap">{dialogState.data.info}</p>
              </div>
            )}
          </div>
           <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
