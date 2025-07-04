
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, Info } from "lucide-react"

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
import { UserForm } from "./user-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

const ITEMS_PER_PAGE = 10;

export default function UsersClient() {
  const { users, roles, clients, addUser, updateUser, deleteUser, allProjects } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'details' | null; data?: User }>({ open: false, type: null })
  
  const [filters, setFilters] = React.useState({ query: '', role: 'all' });
  const [currentPage, setCurrentPage] = React.useState(1);

  const availableRoles = roles.filter(r => r !== 'System').sort();

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };
  
  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
        const queryMatch = filters.query.trim() === '' || 
            user.name.toLowerCase().includes(filters.query.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(filters.query.toLowerCase()));
        
        const roleMatch = filters.role === 'all' || user.role === filters.role;
        
        return queryMatch && roleMatch;
    });
  }, [users, filters]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const handleSave = (values: Omit<User, 'id' | 'avatar' | 'lastLogin'>) => {
    if (dialogState.type === 'new') {
      addUser(values)
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
        <Button onClick={() => openDialog('new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
                placeholder="Search by name or email..." 
                className="max-w-xs"
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
            />
            <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                <SelectTrigger className="w-auto min-w-[180px]">
                    <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {availableRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {user.avatar && <AvatarImage src={user.avatar} alt="User avatar" data-ai-hint="person avatar" />}
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                   <TableCell>
                      <Badge variant={user.role === 'Admin' ? "default" : "secondary"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.department || '—'}</TableCell>
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    No users found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing <strong>{paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedUsers.length}</strong> of <strong>{filteredUsers.length}</strong> users
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
