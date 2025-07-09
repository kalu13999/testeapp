
"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, LineChart, AreaChart, Line, Area } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import * as React from "react"
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, BookCopy, BarChart2, ListTodo, Package, Send, FileClock, ArrowDownToLine, CheckCheck, TrendingUp, Activity, UserCheck, ShieldAlert, Download, ChevronsUpDown, ArrowUp, ArrowDown, Calendar as CalendarIcon } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedProject, EnrichedBook } from "@/lib/data";
import type { EnrichedAuditLog, AppDocument } from "@/context/workflow-context";
import Link from "next/link"
import { subDays, format, eachDayOfInterval, isWithinInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"

import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'On Hold': return 'outline';
        default: return 'outline';
    }
}

const DetailItem = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
  <div className="flex justify-between items-center">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="font-medium text-sm text-right">{value}</div>
  </div>
);

function ProjectDashboard() {
    const { projects, selectedProjectId, auditLogs, documents } = useAppContext();
    const { toast } = useToast();
    const [chartType, setChartType] = React.useState<'bar' | 'line' | 'area'>('bar');
    const [detailState, setDetailState] = React.useState<{ open: boolean; title: string; items: (EnrichedBook | EnrichedAuditLog)[]; type: 'books' | 'activities' | null; }>({ open: false, title: '', items: [], type: null });
    const [detailFilter, setDetailFilter] = React.useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    
    const ITEMS_PER_PAGE = 5;

    // State for Book Progress Table
    const [bookSorting, setBookSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }]);
    const [bookColumnFilters, setBookColumnFilters] = React.useState<{ [key: string]: string }>({});
    const [bookCurrentPage, setBookCurrentPage] = React.useState(1);

    // State for Recent Activity Table
    const [activitySorting, setActivitySorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'date', desc: true }]);
    const [activityColumnFilters, setActivityColumnFilters] = React.useState<{ [key: string]: string }>({});
    const [activityCurrentPage, setActivityCurrentPage] = React.useState(1);
    
    const project = useMemo(() => {
        if (!selectedProjectId) return null;
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);
    
    const filteredDialogItems = React.useMemo(() => {
        if (!detailState.open || !detailFilter) return detailState.items;
        const query = detailFilter.toLowerCase();
        if (detailState.type === 'books') return (detailState.items as EnrichedBook[]).filter(b => b.name.toLowerCase().includes(query));
        if (detailState.type === 'activities') return (detailState.items as EnrichedAuditLog[]).filter(l => l.action.toLowerCase().includes(query) || l.details.toLowerCase().includes(query));
        return detailState.items;
    }, [detailState.items, detailState.type, detailFilter, detailState.open]);

    const dashboardData = useMemo(() => {
        if (!project) return { kpiData: [], workflowChartData: [], dailyChartData: [], projectBooks: [], projectLogs: [], booksByStage: {}, allRelevantAuditLogs: [] };
        
        const books = project.books;
        const projectDocs = documents.filter(doc => doc.projectId === project.id);
        const projectLogs = auditLogs.filter(log => log.bookId && project.books.some(b => b.id === log.bookId));

        const pendingShippingBooks = books.filter(b => b.status === 'Pending Shipment');
        const inTransitBooks = books.filter(b => b.status === 'In Transit');
        const receivedBooks = books.filter(b => b.status === 'Received');
        const pendingValidationBooks = books.filter(b => b.status === 'Pending Validation');
        const workflowBooks = books.filter(b => !['Archived', 'Pending Shipment', 'Finalized', 'Complete'].includes(b.status));
        const finalizedBooks = books.filter(b => b.status === 'Finalized');
        const errorDocs = projectDocs.filter(d => d.flag === 'error');
        const warningDocs = projectDocs.filter(d => d.flag === 'warning');
        const booksWithErrors = Array.from(new Set(errorDocs.map(d => d.bookId))).map(bookId => books.find(b => b.id === bookId)).filter((b): b is EnrichedBook => !!b);
        const booksWithWarnings = Array.from(new Set(warningDocs.map(d => d.bookId))).map(bookId => books.find(b => b.id === bookId)).filter((b): b is EnrichedBook => !!b);
        const actionsTodayLogs = projectLogs.filter(l => l.date.startsWith(new Date().toISOString().slice(0, 10)));


        const kpiData = [
            { title: "Pending Shipping", value: pendingShippingBooks.length.toLocaleString(), icon: Package, description: "Books awaiting client shipment", items: pendingShippingBooks, type: 'books' as const },
            { title: "In Transit", value: inTransitBooks.length.toLocaleString(), icon: Send, description: "Books shipped by the client", items: inTransitBooks, type: 'books' as const },
            { title: "Received by Us", value: receivedBooks.length.toLocaleString(), icon: ArrowDownToLine, description: "Books confirmed at our facility", items: receivedBooks, type: 'books' as const },
            { title: "Pending Client Action", value: pendingValidationBooks.length.toLocaleString(), icon: UserCheck, description: "Books awaiting client approval", items: pendingValidationBooks, type: 'books' as const },
            { title: "Books in Workflow", value: workflowBooks.length.toLocaleString(), icon: BookCopy, description: "Active books being processed", items: workflowBooks, type: 'books' as const },
            { title: "Finalized Books", value: finalizedBooks.length.toLocaleString(), icon: CheckCheck, description: "Books that are approved", items: finalizedBooks, type: 'books' as const },
            { title: "Document Errors", value: errorDocs.length.toLocaleString(), icon: ShieldAlert, description: "Pages flagged with errors", items: booksWithErrors, type: 'books' as const },
            { title: "Document Warnings", value: warningDocs.length.toLocaleString(), icon: AlertTriangle, description: "Pages flagged with warnings", items: booksWithWarnings, type: 'books' as const },
            { title: "Actions Today", value: actionsTodayLogs.length.toLocaleString(), icon: Activity, description: "Actions recorded today", items: actionsTodayLogs, type: 'activities' as const },
        ];

        const orderedStageNames = [
          'In Transit', 'Received', 'To Scan', 'Scanning Started', 'Storage', 'To Indexing', 'Indexing Started', 'To Checking', 'Checking Started', 'Ready for Processing', 'In Processing', 'Processed', 'Final Quality Control', 'Delivery', 'Pending Validation', 'Client Rejected', 'Corrected', 'Finalized'
        ];
        
        const booksByStage: { [key: string]: EnrichedBook[] } = {};
        books.forEach(book => {
            if (orderedStageNames.includes(book.status)) {
                if (!booksByStage[book.status]) booksByStage[book.status] = [];
                booksByStage[book.status].push(book);
            }
        });
        const workflowChartData = orderedStageNames.map(name => ({ name, count: booksByStage[name]?.length || 0 }));
        
        const dailyActivity: { [date: string]: { [action: string]: number } } = {};
        const relevantInterval = (dateRange?.from && dateRange.to) ? { start: dateRange.from, end: dateRange.to } : null;

        if (relevantInterval) {
            const actionsToTrack: { [key: string]: string } = {
                'Book Shipped': 'Shipped',
                'Reception Confirmed': 'Received',
                'Scanning Finished': 'Scanned',
                'Assigned for QC': 'Indexed',
                'Initial QC Complete': 'Checked',
                'Processing Completed': 'Processed',
                'Client Approval': 'Finalized',
                'Book Archived': 'Archived',
                'Client Rejection': 'Rejected'
            };
            
            projectLogs.filter(log => isWithinInterval(new Date(log.date), relevantInterval))
              .forEach(log => {
                const date = log.date.slice(0, 10);
                if (!dailyActivity[date]) dailyActivity[date] = {};

                if (actionsToTrack[log.action]) {
                    const actionName = actionsToTrack[log.action as keyof typeof actionsToTrack];
                    if (!dailyActivity[date][actionName]) dailyActivity[date][actionName] = 0;
                    dailyActivity[date][actionName]++;
                }
                
                if (log.action === 'Workflow Step' && log.details.includes('to Delivery')) {
                    if (!dailyActivity[date]['Delivered']) dailyActivity[date]['Delivered'] = 0;
                    dailyActivity[date]['Delivered']++;
                }
            });
        }
        
        const dateSteps = relevantInterval ? eachDayOfInterval(relevantInterval) : [];
        const dailyChartData = dateSteps.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayData = dailyActivity[dateStr] || {};
            return {
                date: format(date, 'MMM d'),
                fullDate: dateStr,
                Shipped: dayData.Shipped || 0,
                Received: dayData.Received || 0,
                Scanned: dayData.Scanned || 0,
                Indexed: dayData.Indexed || 0,
                Checked: dayData.Checked || 0,
                Processed: dayData.Processed || 0,
                Delivered: dayData.Delivered || 0,
                Finalized: dayData.Finalized || 0,
                Rejected: dayData.Rejected || 0,
                Archived: dayData.Archived || 0
            };
        });
        
        return { kpiData, workflowChartData, dailyChartData, projectBooks: books, projectLogs, booksByStage, allRelevantAuditLogs: projectLogs };
    }, [project, auditLogs, documents, dateRange]);

    const { kpiData, workflowChartData, dailyChartData, projectBooks, projectLogs } = dashboardData;

    // --- Books Table Logic ---
    const sortedAndFilteredBooks = React.useMemo(() => {
        let filtered = projectBooks || [];
        Object.entries(bookColumnFilters).forEach(([columnId, value]) => {
            if (value) filtered = filtered.filter(b => String(b[columnId as keyof EnrichedBook]).toLowerCase().includes(value.toLowerCase()));
        });
        if (bookSorting.length > 0) {
            filtered.sort((a, b) => {
                for (const s of bookSorting) {
                    const valA = a[s.id as keyof EnrichedBook];
                    const valB = b[s.id as keyof EnrichedBook];
                    const result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    if (result !== 0) return s.desc ? -result : result;
                }
                return 0;
            });
        }
        return filtered;
    }, [projectBooks, bookColumnFilters, bookSorting]);
    const paginatedBooks = sortedAndFilteredBooks.slice((bookCurrentPage - 1) * ITEMS_PER_PAGE, bookCurrentPage * ITEMS_PER_PAGE);

    // --- Activity Table Logic ---
    const sortedAndFilteredActivities = React.useMemo(() => {
        let filtered = projectLogs || [];
        Object.entries(activityColumnFilters).forEach(([columnId, value]) => {
            if (value) filtered = filtered.filter(l => String(l[columnId as keyof EnrichedAuditLog]).toLowerCase().includes(value.toLowerCase()));
        });
        if (activitySorting.length > 0) {
            filtered.sort((a, b) => {
                for (const s of activitySorting) {
                    const valA = a[s.id as keyof EnrichedAuditLog];
                    const valB = b[s.id as keyof EnrichedAuditLog];
                    const result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    if (result !== 0) return s.desc ? -result : result;
                }
                return 0;
            });
        }
        return filtered;
    }, [projectLogs, activityColumnFilters, activitySorting]);
    const paginatedActivities = sortedAndFilteredActivities.slice((activityCurrentPage - 1) * ITEMS_PER_PAGE, activityCurrentPage * ITEMS_PER_PAGE);

    // --- Generic Table Helpers ---
    const handleSort = (columnId: string, sorting: any[], setSorting: Function, setCurrentPage: Function) => {
        setCurrentPage(1);
        setSorting((currentSorting: any[]) => {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) return [];
                return [{ id: columnId, desc: true }];
            }
            return [{ id: columnId, desc: false }];
        });
    };
    const getSortIndicator = (columnId: string, sorting: any[]) => {
        const sort = sorting.find(s => s.id === columnId);
        if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
        return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
    };
    const PaginationNav = ({ totalPages, currentPage, setCurrentPage }: { totalPages: number; currentPage: number; setCurrentPage: Function; }) => {
        if (totalPages <= 1) return null;
        return ( <Pagination> <PaginationContent> <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p: number) => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem> <PaginationItem><PaginationLink href="#" isActive>{currentPage} of {totalPages}</PaginationLink></PaginationItem> <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p: number) => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem> </PaginationContent> </Pagination> );
    };
    const downloadFile = (content: string, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    const exportXLSX = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, filename);
        toast({ title: "Export Successful", description: `${data.length} items exported as XLSX.` });
    }
    const exportJSON = (data: any[], filename: string) => { if(data.length === 0) return; downloadFile(JSON.stringify(data, null, 2), filename, 'application/json'); toast({ title: "Export Successful", description: `${data.length} items exported as JSON.` }); };
    const exportCSV = (data: any[], headers: string[], filename: string) => { if (data.length === 0) return; const csvContent = [headers.join(','), ...data.map(item => headers.map(header => { let value = item[header as keyof typeof item] ?? ''; if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`; return value; }).join(','))].join('\n'); downloadFile(csvContent, filename, 'text/csv;charset=utf-8;'); toast({ title: "Export Successful", description: `${data.length} items exported as CSV.` }); };

    const handleKpiClick = (kpi: typeof dashboardData.kpiData[0]) => {
        if (!kpi.items || kpi.items.length === 0 || !kpi.type) return;
        setDetailFilter('');
        setDetailState({
            open: true,
            title: `Details for: ${kpi.title}`,
            items: kpi.items,
            type: kpi.type
        });
    };

    const handleCloseDetailDialog = () => setDetailState({ open: false, title: '', items: [], type: null });
    const handleWorkflowChartClick = (data: any) => {
        if (!data || !data.activePayload?.length) return;
        const stageName = data.activePayload[0].payload.name as string;
        setDetailState({ open: true, title: `Books in Stage: ${stageName}`, items: dashboardData.booksByStage[stageName] || [], type: 'books' });
    };
    const handleDailyChartClick = (data: any) => {
        if (!data || !data.activePayload?.length) return;
        const fullDate = data.activePayload[0].payload.fullDate as string;
        setDetailState({ open: true, title: `Activity for ${format(new Date(fullDate), 'MMMM d, yyyy')}`, items: dashboardData.allRelevantAuditLogs.filter(log => log.date.startsWith(fullDate)), type: 'activities' });
    };

    if (!project) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Project Selected</CardTitle>
                    <CardDescription>Please select a project from the header to view its dashboard.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    const workflowChartConfig = { count: { label: "Books", color: "hsl(var(--primary))" } } satisfies ChartConfig;
    const ChartComponent = { bar: BarChart, line: LineChart, area: AreaChart }[chartType];
    const ChartElement = {
        bar: <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />,
        line: <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />,
        area: <Area type="monotone" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.3} />,
    }[chartType];
    const dailyChartConfig = {
        Shipped: { label: "Shipped", color: "hsl(210, 80%, 50%)" },
        Received: { label: "Received", color: "hsl(180, 70%, 40%)" },
        Scanned: { label: "Scanned", color: "hsl(150, 70%, 40%)" },
        Indexed: { label: "Indexed", color: "hsl(100, 70%, 40%)" },
        Checked: { label: "Checked", color: "hsl(60, 80%, 50%)" },
        Processed: { label: "Processed", color: "hsl(30, 80%, 50%)" },
        Delivered: { label: "Delivered", color: "hsl(0, 80%, 50%)" },
        Finalized: { label: "Finalized", color: "hsl(270, 80%, 60%)" },
        Rejected: { label: "Rejected", color: "hsl(330, 80%, 60%)" },
        Archived: { label: "Archived", color: "hsl(240, 5%, 50%)" },
    } satisfies ChartConfig;

    return (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                     <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {kpiData.map((kpi) => (
                            <Card key={kpi.title} onClick={() => handleKpiClick(kpi)} className={kpi.items && kpi.items.length > 0 ? "cursor-pointer transition-colors hover:bg-muted/50" : ""}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{kpi.value}</div>
                                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Project Details</CardTitle>
                                <CardDescription>At-a-glance project information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <DetailItem label="Client" value={<Link href={`/clients`} className="hover:underline">{project.clientName}</Link>} />
                                <DetailItem label="Status" value={<Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>} />
                                <Separator/>
                                <DetailItem label="Budget" value={`$${project.budget.toLocaleString()}`} />
                                <DetailItem label="Timeline" value={`${project.startDate} to ${project.endDate}`} />
                                <Separator/>
                                <DetailItem label="Total Pages" value={`${project.documentCount.toLocaleString()} / ${project.totalExpected.toLocaleString()}`} />
                                <Progress value={project.progress} />
                                {project.info && (
                                    <>
                                    <Separator/>
                                    <div className="pt-2">
                                        <p className="text-sm text-muted-foreground">Additional Info</p>
                                        <p className="text-sm font-medium whitespace-pre-wrap">{project.info}</p>
                                    </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" className="w-full"><Link href={`/projects/${project.id}`}>View Project Details</Link></Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Workflow State</CardTitle>
                            <CardDescription>Number of books in each phase. Click for details.</CardDescription>
                        </div>
                        <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)} className="w-auto"><TabsList><TabsTrigger value="bar">Bar</TabsTrigger><TabsTrigger value="line">Line</TabsTrigger><TabsTrigger value="area">Area</TabsTrigger></TabsList></Tabs>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={workflowChartConfig} className="h-[300px] w-full cursor-pointer">
                            <ChartComponent data={workflowChartData} onClick={handleWorkflowChartClick}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} angle={-40} textAnchor="end" height={80} interval={0} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/><ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent hideLabel />} />{ChartElement}
                            </ChartComponent>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                   <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Daily Throughput</CardTitle>
                            <CardDescription>Count of books completing key stages. Click a point for details.</CardDescription>
                        </div>
                        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={dailyChartConfig} className="h-[300px] w-full cursor-pointer">
                           <LineChart data={dailyChartData} margin={{ left: 12, right: 12 }} onClick={handleDailyChartClick}>
                               <CartesianGrid vertical={false} />
                               <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                               <YAxis allowDecimals={false} />
                               <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                               <ChartLegend content={<ChartLegendContent />} />
                               {Object.keys(dailyChartConfig).map((key) => (<Line key={key} dataKey={key} type="monotone" stroke={`var(--color-${key})`} strokeWidth={2} dot={false} />))}
                           </LineChart>
                       </ChartContainer>
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <div><CardTitle className="font-headline flex items-center gap-2"><ListTodo className="h-5 w-5" /> Book Progress</CardTitle><CardDescription>Detailed progress for each book in the project.</CardDescription></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-9 gap-1"><Download className="h-3.5 w-3.5" /><span>Export</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Export All ({sortedAndFilteredBooks.length})</DropdownMenuLabel><DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredBooks, 'project_books.xlsx')}>Export as XLSX</DropdownMenuItem><DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredBooks, 'project_books.json')}>Export as JSON</DropdownMenuItem><DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredBooks, ['name', 'status', 'progress'], 'project_books.csv')}>Export as CSV</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name', bookSorting, setBookSorting, setBookCurrentPage)}>Book Name {getSortIndicator('name', bookSorting)}</div></TableHead><TableHead className="w-40"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status', bookSorting, setBookSorting, setBookCurrentPage)}>Status {getSortIndicator('status', bookSorting)}</div></TableHead><TableHead className="w-48"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('progress', bookSorting, setBookSorting, setBookCurrentPage)}>Progress {getSortIndicator('progress', bookSorting)}</div></TableHead></TableRow>
                                    <TableRow><TableHead><Input placeholder="Filter name..." value={bookColumnFilters['name'] || ''} onChange={e => setBookColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead><TableHead><Input placeholder="Filter status..." value={bookColumnFilters['status'] || ''} onChange={e => setBookColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead><TableHead/></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedBooks.length > 0 ? paginatedBooks.map(book => (<TableRow key={book.id}><TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell><TableCell><Badge variant="outline">{book.status}</Badge></TableCell><TableCell><Progress value={book.progress} className="h-2"/></TableCell></TableRow>)) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No books match your filters.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="justify-end"><PaginationNav totalPages={Math.ceil(sortedAndFilteredBooks.length/ITEMS_PER_PAGE)} currentPage={bookCurrentPage} setCurrentPage={setBookCurrentPage} /></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <div><CardTitle className="font-headline flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activity</CardTitle><CardDescription>Latest actions performed in this project.</CardDescription></div>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-9 gap-1"><Download className="h-3.5 w-3.5" /><span>Export</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Export All ({sortedAndFilteredActivities.length})</DropdownMenuLabel><DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredActivities, 'project_activity.xlsx')}>Export as XLSX</DropdownMenuItem><DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredActivities, 'project_activity.json')}>Export as JSON</DropdownMenuItem><DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredActivities, ['action', 'details', 'user', 'date'], 'project_activity.csv')}>Export as CSV</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('action', activitySorting, setActivitySorting, setActivityCurrentPage)}>Action {getSortIndicator('action', activitySorting)}</div></TableHead><TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('user', activitySorting, setActivitySorting, setActivityCurrentPage)}>User {getSortIndicator('user', activitySorting)}</div></TableHead><TableHead className="w-48"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('date', activitySorting, setActivitySorting, setActivityCurrentPage)}>Date {getSortIndicator('date', activitySorting)}</div></TableHead></TableRow>
                                    <TableRow><TableHead><Input placeholder="Filter action..." value={activityColumnFilters['action'] || ''} onChange={e => setActivityColumnFilters(p => ({...p, action: e.target.value}))} className="h-8"/></TableHead><TableHead><Input placeholder="Filter user..." value={activityColumnFilters['user'] || ''} onChange={e => setActivityColumnFilters(p => ({...p, user: e.target.value}))} className="h-8"/></TableHead><TableHead/></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedActivities.length > 0 ? paginatedActivities.map(activity => (<TableRow key={activity.id}><TableCell><Link href={`/books/${activity.bookId}`} className="font-medium truncate hover:underline">{activity.action}</Link><div className="text-xs text-muted-foreground truncate">{activity.details}</div></TableCell><TableCell>{activity.user}</TableCell><TableCell className="text-xs">{new Date(activity.date).toLocaleString()}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No recent activity for this project.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter className="justify-end"><PaginationNav totalPages={Math.ceil(sortedAndFilteredActivities.length/ITEMS_PER_PAGE)} currentPage={activityCurrentPage} setCurrentPage={setActivityCurrentPage} /></CardFooter>
                    </Card>
                </div>
            </div>
            <Dialog open={detailState.open} onOpenChange={handleCloseDetailDialog}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{detailState.title}</DialogTitle><DialogDescription>Showing {filteredDialogItems.length} of {detailState.items.length} total items.</DialogDescription></DialogHeader><div className="py-2"><Input placeholder={detailState.type === 'books' ? "Filter by book name..." : "Filter by action, details, or user..."} value={detailFilter} onChange={(e) => setDetailFilter(e.target.value)} /></div><div className="max-h-[60vh] overflow-y-auto pr-4">{filteredDialogItems.length > 0 ? (<>{detailState.type === 'books' && (<Table><TableHeader><TableRow><TableHead>Book Name</TableHead><TableHead>Project</TableHead><TableHead>Client</TableHead></TableRow></TableHeader><TableBody>{(filteredDialogItems as EnrichedBook[]).map(book => (<TableRow key={book.id}><TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell><TableCell>{book.projectName}</TableCell><TableCell>{book.clientName}</TableCell></TableRow>))}</TableBody></Table>)}{detailState.type === 'activities' && (<Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>User</TableHead><TableHead>Time</TableHead></TableRow></TableHeader><TableBody>{(filteredDialogItems as EnrichedAuditLog[]).map(log => (<TableRow key={log.id}><TableCell className="font-medium">{log.action}</TableCell><TableCell>{log.details}</TableCell><TableCell>{log.user}</TableCell><TableCell>{new Date(log.date).toLocaleTimeString()}</TableCell></TableRow>))}</TableBody></Table>)}</>) : (<div className="text-center py-10 text-muted-foreground"><p>No items match your filter.</p></div>)}</div></DialogContent></Dialog>
        </>
    )
}

function ClientDashboard() {
    const { books, currentUser } = useAppContext();

    const clientData = useMemo(() => {
        if (!currentUser || !currentUser.clientId) {
            return { pendingShipping: [], inTransit: [], pendingValidation: [], received: [] };
        }
        const clientBooks = books.filter(b => b.clientId === currentUser.clientId);
        
        const pendingShipping = clientBooks.filter(b => b.status === 'Pending Shipment');
        const inTransit = clientBooks.filter(b => b.status === 'In Transit');
        const pendingValidation = clientBooks.filter(b => b.status === 'Pending Validation');
        const received = clientBooks.filter(b => b.status === 'Received');

        return { pendingShipping, inTransit, pendingValidation, received };
    }, [books, currentUser]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Shipping</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.pendingShipping.length}</div>
                        <p className="text-xs text-muted-foreground">Batches ready for you to send</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.inTransit.length}</div>
                        <p className="text-xs text-muted-foreground">Batches you have shipped to us</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Received by Us</CardTitle>
                        <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.received.length}</div>
                        <p className="text-xs text-muted-foreground">Batches confirmed at our facility</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                        <FileClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.pendingValidation.length}</div>
                        <p className="text-xs text-muted-foreground">Batches awaiting your review</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Ready to Ship</CardTitle>
                        <CardDescription>These batches are ready to be sent to us for processing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Batch Name</TableHead><TableHead>Project</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {clientData.pendingShipping.length > 0 ? clientData.pendingShipping.map(book => (
                                    <TableRow key={book.id}>
                                        <TableCell className="font-medium">{book.name}</TableCell>
                                        <TableCell>{book.projectName}</TableCell>
                                        <TableCell><Button asChild variant="secondary" size="sm"><Link href="/shipments">Prepare Shipment</Link></Button></TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">You have no batches to ship.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Awaiting Your Validation</CardTitle><CardDescription>These batches are ready for your review and approval.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Batch Name</TableHead><TableHead>Project</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {clientData.pendingValidation.length > 0 ? clientData.pendingValidation.map(book => (
                                    <TableRow key={book.id}>
                                        <TableCell className="font-medium">{book.name}</TableCell>
                                        <TableCell>{book.projectName}</TableCell>
                                        <TableCell><Button asChild variant="secondary" size="sm"><Link href="/pending-deliveries">Review Batch</Link></Button></TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No batches are awaiting your approval.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function DashboardClient() {
    const { currentUser, selectedProjectId, projects } = useAppContext();

    if (!currentUser) {
        return <p>Loading user data...</p>;
    }

    const renderDashboard = () => {
        switch(currentUser.role) {
            case 'Admin':
            case 'Operator':
            case 'QC Specialist':
            case 'Reception':
            case 'Scanning':
            case 'Indexing':
            case 'Processing':
            case 'Delivery':
            case 'Correction Specialist':
            case 'Multi-Operator':
            case 'Supervisor':
                return <ProjectDashboard />;
            case 'Client':
                return <ClientDashboard />;
            default:
                return (
                    <Card>
                        <CardHeader><CardTitle>Welcome, {currentUser.name}</CardTitle></CardHeader>
                        <CardContent><p>Select an item from the menu to get started.</p></CardContent>
                    </Card>
                );
        }
    }

    const projectName = projects.find(p=>p.id === selectedProjectId)?.name || "Dashboard";

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                {projectName}
            </h1>
            {renderDashboard()}
        </div>
    )
}

    