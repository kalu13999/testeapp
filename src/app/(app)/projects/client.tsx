
"use client"

import Link from "next/link";
import * as React from "react"
import * as XLSX from 'xlsx';
import { format } from "date-fns";

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
import { MoreHorizontal, PlusCircle, Trash2, Edit, Info, ArrowUp, ArrowDown, ChevronsUpDown, Download } from "lucide-react";
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
import { ProjectForm } from "./project-form";
import { useAppContext } from "@/context/workflow-context";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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
  const { accessibleProjectsForUser: projects, clients, addProject, updateProject, deleteProject } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | 'details' | null; data?: EnrichedProject }>({ open: false, type: null })
  const { toast } = useToast();
  
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);

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

  const sortedAndFilteredProjects = React.useMemo(() => {
    let filtered = projects;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
        if (value) {
            filtered = filtered.filter(project => {
                const projectValue = project[columnId as keyof EnrichedProject];
                return String(projectValue).toLowerCase().includes(value.toLowerCase());
            });
        }
    });

     if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedProject;
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

  }, [projects, columnFilters, sorting]);
  
  const selectedProjects = React.useMemo(() => {
    return sortedAndFilteredProjects.filter(project => selection.includes(project.id));
  }, [sortedAndFilteredProjects, selection]);

  React.useEffect(() => {
    setSelection([]);
  }, [columnFilters, sorting]);

  const totalPages = Math.ceil(sortedAndFilteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = sortedAndFilteredProjects.slice(
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

  const exportJSON = (data: EnrichedProject[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'projects_export.json', 'application/json');
    toast({ title: "Export Successful", description: `${data.length} projects exported as JSON.` });
  }

  const exportCSV = (data: EnrichedProject[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'clientName', 'status', 'startDate', 'endDate', 'budget', 'progress', 'documentCount', 'totalExpected', 'description', 'info'];
    const csvContent = [
        headers.join(','),
        ...data.map(project => 
            headers.map(header => {
                let value = project[header as keyof EnrichedProject] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, 'projects_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Export Successful", description: `${data.length} projects exported as CSV.` });
  }

  const exportXLSX = (data: EnrichedProject[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, "projects_export.xlsx");
    toast({ title: "Export Successful", description: `${data.length} projects exported as XLSX.` });
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
                        <DropdownMenuItem onSelect={() => exportXLSX(selectedProjects)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportJSON(selectedProjects)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportCSV(selectedProjects)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Export All ({sortedAndFilteredProjects.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredProjects)} disabled={sortedAndFilteredProjects.length === 0}>Export as XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredProjects)} disabled={sortedAndFilteredProjects.length === 0}>Export as JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredProjects)} disabled={sortedAndFilteredProjects.length === 0}>Export as CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => openDialog('new')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Project
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
                            onCheckedChange={(checked) => setSelection(checked ? paginatedProjects.map(p => p.id) : [])}
                            checked={paginatedProjects.length > 0 && paginatedProjects.every(p => selection.includes(p.id))}
                            aria-label="Select all on this page"
                        />
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                            Project Name {getSortIndicator('name')}
                        </div>
                      </TableHead>
                      <TableHead>
                         <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('clientName', e.shiftKey)}>
                            Client {getSortIndicator('clientName')}
                        </div>
                      </TableHead>
                      <TableHead>
                         <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>
                            Status {getSortIndicator('status')}
                        </div>
                      </TableHead>
                      <TableHead>
                         <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('endDate', e.shiftKey)}>
                            End Date {getSortIndicator('endDate')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                      <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                   <TableRow>
                        <TableHead/>
                        <TableHead>
                            <Input
                                placeholder="Filter name..."
                                value={columnFilters['name'] || ''}
                                onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filter client..."
                                value={columnFilters['clientName'] || ''}
                                onChange={(e) => handleColumnFilterChange('clientName', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filter status..."
                                value={columnFilters['status'] || ''}
                                onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead>
                            <Input
                                placeholder="Filter date..."
                                value={columnFilters['endDate'] || ''}
                                onChange={(e) => handleColumnFilterChange('endDate', e.target.value)}
                                className="h-8"
                            />
                        </TableHead>
                        <TableHead/>
                        <TableHead/>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedProjects.length > 0 ? paginatedProjects.map((project) => (
                      <TableRow key={project.id} data-state={selection.includes(project.id) && "selected"}>
                          <TableCell>
                            <Checkbox
                                checked={selection.includes(project.id)}
                                onCheckedChange={(checked) => {
                                    setSelection(
                                    checked
                                        ? [...selection, project.id]
                                        : selection.filter((id) => id !== project.id)
                                    )
                                }}
                                aria-label={`Select project ${project.name}`}
                                />
                          </TableCell>
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
                           <TableCell>{format(new Date(project.endDate), "yyyy-MM-dd")}</TableCell>
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
                      <TableCell colSpan={7} className="h-24 text-center">
                        No projects found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
              </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {selection.length > 0 ? `${selection.length} of ${sortedAndFilteredProjects.length} project(s) selected.` : `Showing ${paginatedProjects.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedProjects.length} of ${sortedAndFilteredProjects.length} projects`}
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
              <p className="col-span-2 font-medium">{dialogState.data?.startDate ? format(new Date(dialogState.data.startDate), "LLL d, yyyy") : '—'}</p>
            </div>
             <div className="grid grid-cols-3 items-center gap-x-4">
              <p className="text-muted-foreground">End Date</p>
              <p className="col-span-2 font-medium">{dialogState.data?.endDate ? format(new Date(dialogState.data.endDate), "LLL d, yyyy") : '—'}</p>
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
