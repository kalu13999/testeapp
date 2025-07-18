

"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ProjectForm } from "../project-form";
import { useAppContext } from "@/context/workflow-context";
import { type EnrichedBook, type Project } from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WORKFLOW_PHASES, MANDATORY_STAGES, STAGE_CONFIG, findStageKeyFromStatus } from "@/lib/workflow-config";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast";
import { Book, Edit, DollarSign, Calendar, Info, ArrowUp, ArrowDown, ChevronsUpDown, Settings2, Package, LucideIcon, BookCopy, AlertTriangle, CheckCircle, Download, Loader2, XCircle } from "lucide-react";


interface ProjectDetailClientProps {
  projectId: string;
}

const ITEMS_PER_PAGE = 10;

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'On Hold': return 'outline';
        default: return 'outline';
    }
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="font-medium">{value}</div>
  </div>
);

export default function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const { allProjects, clients, updateProject, projectWorkflows, updateProjectWorkflow, documents } = useAppContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = React.useState(false);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  const { toast } = useToast();
  
  const [detailState, setDetailState] = React.useState<{ open: boolean; title: string; items: EnrichedBook[]; }>({ open: false, title: '', items: [] });
  const [detailFilter, setDetailFilter] = React.useState('');

  const project = allProjects.find(p => p.id === projectId);
  const projectWorkflow = projectWorkflows[projectId] || [];

  const handleSave = (values: Omit<Project, 'id'>) => {
    updateProject(projectId, values);
    setIsEditDialogOpen(false);
  }
  
  const handleWorkflowSave = (newWorkflow: string[]) => {
    updateProjectWorkflow(projectId, newWorkflow);
    setIsWorkflowDialogOpen(false);
  }

  const handleSort = (columnId: string, isShift: boolean) => {
    setSorting(currentSorting => {
        const existingSortIndex = currentSorting.findIndex(s => s.id === columnId);
        if (isShift) {
            let newSorting = [...currentSorting];
            if (existingSortIndex > -1) {
                if (newSorting[existingSortIndex].desc) { newSorting.splice(existingSortIndex, 1); } 
                else { newSorting[existingSortIndex].desc = true; }
            } else {
                newSorting.push({ id: columnId, desc: false });
            }
            return newSorting;
        } else {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) { return []; }
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
    return <div className="flex items-center gap-1">{icon}{sorting.length > 1 && (<span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>)}</div>;
  }
  
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
    setCurrentPage(1);
  };
  
  const kpiData = React.useMemo(() => {
    if (!project) return [];
    const books = project.books;
    const errorDocs = documents.filter(d => d.projectId === project.id && d.flag === 'error');
    const booksWithErrors = Array.from(new Set(errorDocs.map(d => d.bookId))).map(bookId => books.find(b => b.id === bookId)).filter((b): b is EnrichedBook => !!b);

    return [
      { title: "Total Books", value: books.length, icon: BookCopy, items: books },
      { title: "Books In Progress", value: books.filter(b => !['Complete', 'Archived', 'Pending Shipment', 'Finalized'].includes(b.status)).length, icon: Loader2, items: books.filter(b => !['Complete', 'Archived', 'Pending Shipment', 'Finalized'].includes(b.status)) },
      { title: "Books Completed", value: books.filter(b => ['Complete', 'Archived', 'Finalized'].includes(b.status)).length, icon: CheckCircle, items: books.filter(b => ['Complete', 'Archived', 'Finalized'].includes(b.status)) },
      { title: "Books with Errors", value: booksWithErrors.length, icon: AlertTriangle, items: booksWithErrors }
    ];
  }, [project, documents]);
  
  const handleKpiClick = (kpi: (typeof kpiData)[0]) => {
    if (!kpi.items || kpi.items.length === 0) return;
    setDetailFilter('');
    setDetailState({
        open: true,
        title: `Details for: ${kpi.title}`,
        items: kpi.items,
    });
  };

  const filteredDialogItems = React.useMemo(() => {
    if (!detailState.open || !detailFilter) return detailState.items;
    const query = detailFilter.toLowerCase();
    return detailState.items.filter(book =>
      book.name.toLowerCase().includes(query) ||
      book.status.toLowerCase().includes(query)
    );
  }, [detailState.items, detailFilter, detailState.open]);

  
  const chartData = React.useMemo(() => {
      if (!project) return [];
      const booksByStage = project.books.reduce((acc, book) => {
          const stage = book.status || 'Unknown';
          acc[stage] = (acc[stage] || 0) + 1;
          return acc;
      }, {} as { [key: string]: number });
      return Object.entries(booksByStage).map(([name, count], index) => ({ 
        name, 
        count,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`
      }));
  }, [project]);
  
  const chartConfig: ChartConfig = { count: { label: "Books", color: "hsl(var(--chart-1))" } };
  
  const sortedBooks = React.useMemo(() => {
    if (!project) return [];
    let projectBooks = [...project.books];
    
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        projectBooks = projectBooks.filter(book => String(book[columnId as keyof EnrichedBook]).toLowerCase().includes(value.toLowerCase()));
      }
    });

    if (sorting.length > 0) {
        projectBooks.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
                const valA = a[key as keyof typeof a] ?? '';
                const valB = b[key as keyof typeof b] ?? '';
                let result = 0;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    result = valA - valB;
                } else {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }
                if (result !== 0) return s.desc ? -result : result;
            }
            return 0;
        });
    }
    return projectBooks;
  }, [project, sorting, columnFilters]);

  const totalPages = Math.ceil(sortedBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = sortedBooks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const selectedBooks = React.useMemo(() => sortedBooks.filter(book => selection.includes(book.id)), [sortedBooks, selection]);

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
  };
  const exportJSON = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'project_books_export.json', 'application/json');
    toast({ title: "Export Successful", description: `${data.length} books exported as JSON.` });
  };
  const exportCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'status', 'progress', 'documentCount', 'expectedDocuments'];
    const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
    downloadFile(csvContent, 'project_books_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Export Successful", description: `${data.length} books exported as CSV.` });
  };
  const exportXLSX = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "project_books_export.xlsx");
    toast({ title: "Export Successful", description: `${data.length} books exported as XLSX.` });
  };

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          {/* For simplicity, showing current page of total */}
          <PaginationItem><PaginationLink href="#">Page {currentPage} of {totalPages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };


  if (!project) {
      return (
          <Card>
              <CardHeader><CardTitle>Project Not Found</CardTitle></CardHeader>
              <CardContent><p>This project could not be found.</p></CardContent>
          </Card>
      )
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-headline text-3xl tracking-tight">{project.name}</CardTitle>
                    <CardDescription className="text-base">{project.clientName}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={() => setIsWorkflowDialogOpen(true)}>
                      <Settings2 className="mr-2 h-4 w-4"/>
                      Edit Workflow
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                      <Edit className="mr-2 h-4 w-4"/>
                      Edit Project
                    </Button>
                  </div>
              </div>
            </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Project Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                    <DetailItem label="Status" value={<Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>} />
                    <DetailItem label="Budget" value={`$${project.budget.toLocaleString()}`} />
                    <DetailItem label="Timeline" value={`${format(new Date(project.startDate), "LLL d, yyyy")} to ${format(new Date(project.endDate), "LLL d, yyyy")}`} />
                    <div className="col-span-full">
                        <DetailItem label="Overall Progress" value={`${project.documentCount.toLocaleString()} / ${project.totalExpected.toLocaleString()} pages`} />
                        <Progress value={project.progress} className="mt-2 h-2" />
                    </div>
                </div>
                 {project.description && (
                  <>
                    <Separator className="my-4"/>
                    <DetailItem label="Description" value={<p className="text-sm font-normal text-foreground">{project.description}</p>} />
                  </>
                )}
                 {project.info && (
                  <>
                    <Separator className="my-4"/>
                    <DetailItem label="Additional Info" value={<p className="text-sm font-normal text-foreground whitespace-pre-wrap">{project.info}</p>} />
                  </>
                )}
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiData.map((kpi) => (
                <Card key={kpi.title} onClick={() => handleKpiClick(kpi)} className={kpi.items && kpi.items.length > 0 ? "cursor-pointer transition-colors hover:bg-muted/50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{kpi.value}</div></CardContent>
                </Card>
            ))}
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Project Status</CardTitle>
                <CardDescription>Distribution of books by workflow stage.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={120}/>
                        <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                    </BarChart>
                </ChartContainer>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Book className="h-5 w-5" /> Book Manifest</CardTitle>
                    <CardDescription>Detailed breakdown of each book within the project.</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-9 gap-1"><Download className="h-3.5 w-3.5" /><span>Export</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Export All ({sortedBooks.length})</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => exportXLSX(sortedBooks)} disabled={sortedBooks.length === 0}>Export as XLSX</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => exportJSON(sortedBooks)} disabled={sortedBooks.length === 0}>Export as JSON</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => exportCSV(sortedBooks)} disabled={sortedBooks.length === 0}>Export as CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"><Checkbox onCheckedChange={(checked) => setSelection(checked ? paginatedBooks.map(b => b.id) : [])} checked={paginatedBooks.length > 0 && selection.length === paginatedBooks.length} /></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>Book Name {getSortIndicator('name')}</div></TableHead>
                            <TableHead className="w-[150px]"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Status {getSortIndicator('status')}</div></TableHead>
                            <TableHead className="w-[150px] text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('documentCount', e.shiftKey)}>Documents {getSortIndicator('documentCount')}</div></TableHead>
                            <TableHead className="w-[200px]"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('progress', e.shiftKey)}>Progress {getSortIndicator('progress')}</div></TableHead>
                        </TableRow>
                          <TableRow>
                            <TableHead />
                            <TableHead><Input placeholder="Filter by name..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8" /></TableHead>
                            <TableHead><Input placeholder="Filter by status..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8" /></TableHead>
                            <TableHead><Input placeholder="Filter by docs..." value={columnFilters['documentCount'] || ''} onChange={(e) => handleColumnFilterChange('documentCount', e.target.value)} className="h-8" /></TableHead>
                            <TableHead><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear</Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedBooks.length > 0 ? paginatedBooks.map(book => (
                            <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                                <TableCell><Checkbox checked={selection.includes(book.id)} onCheckedChange={(checked) => setSelection(prev => checked ? [...prev, book.id] : prev.filter(id => id !== book.id))} /></TableCell>
                                <TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell>
                                <TableCell><Badge variant="outline">{book.status}</Badge></TableCell>
                                <TableCell className="text-center">{book.documentCount} / {book.expectedDocuments}</TableCell>
                                <TableCell><Progress value={book.progress} className="h-2" /></TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No books found for this project.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
            {totalPages > 1 && <CardFooter className="justify-between"><div className="text-xs text-muted-foreground">{selection.length} of {sortedBooks.length} selected</div><PaginationNav /></CardFooter>}
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Workflow Configuration</CardTitle>
                    <CardDescription>
                        The sequence of stages enabled for this project. Disabled phases are skipped.
                    </CardDescription>
                </div>
                 <Button variant="outline" size="sm" onClick={() => setIsWorkflowDialogOpen(true)}>
                    <Settings2 className="mr-2 h-4 w-4"/>
                    Edit Workflow
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                {WORKFLOW_PHASES.map(group => (
                    <div key={group.name}>
                        <h4 className="font-semibold text-base mb-3 border-b pb-2">{group.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        {group.stages.map(stageKey => {
                            const stageConfig = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG];
                            if (!stageConfig) return null;

                            const isMandatory = MANDATORY_STAGES.includes(stageKey);
                            const isEnabled = isMandatory || projectWorkflow.includes(stageKey);

                            return (
                                <div key={stageKey} className={cn(
                                    "flex items-center space-x-3",
                                    !isEnabled && !group.toggleable && "opacity-60"
                                )}>
                                    {isEnabled ? (
                                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "font-medium text-sm",
                                            !isEnabled && "line-through"
                                        )}>
                                            {stageConfig.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{stageConfig.description}</span>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Modify the details of your project.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            project={project}
            clients={clients}
            onSave={handleSave}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={detailState.open} onOpenChange={(open) => { if (!open) setDetailFilter(''); setDetailState(prev => ({ ...prev, open })); }}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{detailState.title}</DialogTitle>
                <DialogDescription>Showing {filteredDialogItems.length} of {detailState.items.length} total books.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <Input 
                    placeholder="Filter by name or status..."
                    value={detailFilter}
                    onChange={(e) => setDetailFilter(e.target.value)}
                />
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-4">
                  {filteredDialogItems.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Book Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Pages</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDialogItems.map(book => (
                                <TableRow key={book.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{book.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{book.documentCount} / {book.expectedDocuments}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No books match your filter.</p>
                    </div>
                  )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDetailState({ open: false, title: '', items: [] })}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowConfigDialog 
        open={isWorkflowDialogOpen}
        onOpenChange={setIsWorkflowDialogOpen}
        projectName={project.name}
        currentWorkflow={projectWorkflow}
        onSave={handleWorkflowSave}
      />
    </>
  )
}

// --- Workflow Configuration Dialog Component ---
interface WorkflowConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  currentWorkflow: string[];
  onSave: (newWorkflow: string[]) => void;
}

function WorkflowConfigDialog({ open, onOpenChange, projectName, currentWorkflow, onSave }: WorkflowConfigDialogProps) {
  
  const [enabledPhases, setEnabledPhases] = React.useState<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    if (open) {
      const initialPhases: { [key: string]: boolean } = {};
      WORKFLOW_PHASES.forEach(group => {
        if (group.toggleable) {
          const isEnabled = currentWorkflow.includes(group.stages[0]);
          initialPhases[group.id] = isEnabled;
        }
      });
      setEnabledPhases(initialPhases);
    }
  }, [open, currentWorkflow]);
  
  const handleToggle = (phaseId: string, checked: boolean) => {
    setEnabledPhases(prev => ({
      ...prev,
      [phaseId]: checked,
    }));
  }
  
  const handleSaveChanges = () => {
    let newWorkflow = [...MANDATORY_STAGES];
    
    WORKFLOW_PHASES.forEach(group => {
      if (group.toggleable && enabledPhases[group.id]) {
        newWorkflow.push(...group.stages);
      }
    });

    onSave(newWorkflow);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Workflow for: {projectName}</DialogTitle>
          <DialogDescription>
            Select which optional phases this project will use. Disabled phases will be skipped, moving books to the next enabled stage.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4 border rounded-md">
          <div className="space-y-6">
            {WORKFLOW_PHASES.map(group => (
              <div key={group.name}>
                <h4 className="font-semibold text-base mb-3 border-b pb-2">{group.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {group.toggleable ? (
                     <div className="flex items-center space-x-3">
                        <Switch
                          id={group.id}
                          checked={enabledPhases[group.id] ?? false}
                          onCheckedChange={(checked) => handleToggle(group.id, checked)}
                        />
                        <Label htmlFor={group.id} className="flex flex-col">
                          <span>Enable {group.name} Phase</span>
                           <span className="text-xs text-muted-foreground">{group.description}</span>
                        </Label>
                      </div>
                  ) : (
                    group.stages.map(stageKey => {
                      const stageConfig = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG];
                      const isMandatory = MANDATORY_STAGES.includes(stageKey);
                      const isEnabled = isMandatory || currentWorkflow.includes(stageKey);
                      return (
                         <div key={stageKey} className="flex items-center space-x-3 opacity-70">
                            <Switch checked={isEnabled} disabled={true} />
                            <Label htmlFor={stageKey} className="flex flex-col">
                              <span>{stageConfig.title}</span>
                              <span className="text-xs text-muted-foreground">Mandatory</span>
                            </Label>
                          </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
