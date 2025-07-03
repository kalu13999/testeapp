"use client"

import Link from "next/link";
import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Info } from "lucide-react";
import { type Client, type EnrichedProject, type Project } from "@/lib/data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { ProjectForm } from "./project-form";
import { useAppContext } from "@/context/workflow-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 10;

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'On Hold': return 'outline';
        default: return 'outline';
    }
}

export default function ProjectsClient() {
  const { projects, clients, addProject, updateProject, deleteProject } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'details' | null; data?: EnrichedProject }>({ open: false, type: null })
  
  const [filters, setFilters] = React.useState({ query: '', client: 'all', status: 'all' });
  const [currentPage, setCurrentPage] = React.useState(1);

  const clientNames = [...new Set(clients.map(c => c.name))].sort();
  const statuses = [...new Set(projects.map(p => p.status))].sort();

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };

  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
        const queryMatch = filters.query.trim() === '' || 
            project.name.toLowerCase().includes(filters.query.toLowerCase());
        
        const clientMatch = filters.client === 'all' || project.clientName === filters.client;
        const statusMatch = filters.status === 'all' || project.status === filters.status;
        
        return queryMatch && clientMatch && statusMatch;
    });
  }, [projects, filters]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    const pageNumbers: number[] = [];
    // ... logic to build pageNumbers array with ellipses
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

  const openDialog = (type: 'new' | 'edit' | 'delete' | 'details', data?: EnrichedProject) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
  }

  const handleSave = (values: Omit<Project, 'id'>) => {
    if (dialogState.type === 'new') {
      addProject(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateProject(dialogState.data.id, values);
    }
    closeDialog();
  }

  const handleDelete = () => {
    if (!dialogState.data) return;
    deleteProject(dialogState.data.id);
    closeDialog();
  }


  return (
    <>
      <div className="space-y-6">
          <div className="flex items-center justify-between">
              <div>
                  <h1 className="font-headline text-3xl font-bold tracking-tight">Projects</h1>
                  <p className="text-muted-foreground">Manage and track all ongoing projects.</p>
              </div>
              <Button onClick={() => openDialog('new')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Project
              </Button>
          </div>
          <Card>
              <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input 
                        placeholder="Search by project name..." 
                        className="max-w-xs"
                        value={filters.query}
                        onChange={(e) => handleFilterChange('query', e.target.value)}
                    />
                    <Select value={filters.client} onValueChange={(value) => handleFilterChange('client', value)}>
                        <SelectTrigger className="w-auto min-w-[180px]">
                            <SelectValue placeholder="Filter by Client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {clientNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-auto min-w-[180px]">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {statuses.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
              </CardHeader>
              <CardContent>
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                      <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedProjects.length > 0 ? paginatedProjects.map((project) => (
                      <TableRow key={project.id}>
                          <TableCell className="font-medium">
                              <Link href={`/projects/${project.id}`} className="hover:underline">
                                  {project.name}
                              </Link>
                          </TableCell>
                          <TableCell>{project.clientName}</TableCell>
                          <TableCell>
                              <Badge variant={getStatusBadgeVariant(project.status)}>
                                  {project.status}
                              </Badge>
                          </TableCell>
                           <TableCell>{project.endDate}</TableCell>
                          <TableCell>
                              <Progress value={project.progress} className="h-2" />
                          </TableCell>
                          <TableCell>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button aria-haspopup="true" size="icon" variant="ghost">
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">Toggle menu</span>
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onSelect={() => openDialog('details', project)}>
                                        <Info className="mr-2 h-4 w-4" /> Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => openDialog('edit', project)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => openDialog('delete', project)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No projects found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
              </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing <strong>{paginatedProjects.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedProjects.length}</strong> of <strong>{filteredProjects.length}</strong> projects
                </div>
                <PaginationNav />
              </CardFooter>
          </Card>
      </div>

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Create New Project' : 'Edit Project'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Add a new project to the system.' : `Editing project: ${dialogState.data?.name}`}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm 
            project={dialogState.data}
            clients={clients}
            onSave={handleSave}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.open && dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project <span className="font-bold">{dialogState.data?.name}</span> and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete Project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogState.open && dialogState.type === 'details'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
            <DialogDescription>{dialogState.data?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Client</p>
              <p className="col-span-2 font-medium">{dialogState.data?.clientName}</p>
            </div>
             <div className="grid grid-cols-3 items-start gap-x-4">
              <p className="text-muted-foreground">Description</p>
              <p className="col-span-2 font-medium">{dialogState.data?.description}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Start Date</p>
              <p className="col-span-2 font-medium">{dialogState.data?.startDate}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">End Date</p>
              <p className="col-span-2 font-medium">{dialogState.data?.endDate}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">Budget</p>
              <p className="col-span-2 font-medium">${dialogState.data?.budget.toLocaleString()}</p>
            </div>
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
    </>
  )
}
