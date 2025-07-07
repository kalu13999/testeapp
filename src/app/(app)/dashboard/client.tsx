
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, BookCopy, CheckCircle2, UserCheck, BarChart2, ListTodo, Activity, TrendingUp, ScanLine, Clock, ThumbsUp, Package, Send, FileClock, CheckCheck } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedBook, AppDocument, EnrichedProject, EnrichedAuditLog, User } from "@/context/workflow-context"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { subDays, format } from "date-fns"
import { Input } from "@/components/ui/input"

// --- ADMIN DASHBOARD ---

const kpiIconMap: { [key: string]: React.ElementType } = {
    "Books in Workflow": BookCopy,
    "Pending Client Action": UserCheck,
    "SLA Warnings": AlertTriangle,
    "Pages Processed Today": CheckCircle2,
};

type KpiData = {
    title: string;
    value: string;
    description: string;
    icon: React.ElementType;
}

type ChartData = {
    name: string;
    count: number;
}

type ProjectProgressData = {
    id: string;
    name: string;
    client: string;
    progress: number;
    status: string;
}

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'On Hold': return 'outline';
        default: return 'outline';
    }
}

function AdminDashboard() {
    const { projects, books, documents, auditLogs, selectedProjectId } = useAppContext();
    const [chartType, setChartType] = React.useState<'bar' | 'line' | 'area'>('bar');
    const [detailState, setDetailState] = React.useState<{
      open: boolean;
      title: string;
      items: (EnrichedBook | EnrichedAuditLog)[];
      type: 'books' | 'activities' | null;
    }>({ open: false, title: '', items: [], type: null });
    const [detailFilter, setDetailFilter] = React.useState('');

    const dashboardData = useMemo(() => {
        const relevantProjects = selectedProjectId ? projects.filter(p => p.id === selectedProjectId) : projects;
        const relevantProjectIds = new Set(relevantProjects.map(p => p.id));
        const relevantBooks = books.filter(b => relevantProjectIds.has(b.projectId));
        const relevantDocuments = documents.filter(d => relevantProjectIds.has(d.projectId));
        const relevantAuditLogs = auditLogs.filter(log => log.bookId && relevantProjectIds.has(books.find(b => b.id === log.bookId)?.projectId || ''));
        
        const booksInWorkflow = relevantBooks.filter(b => !['Complete', 'Archived'].includes(b.status)).length;
        const pendingClientAction = relevantBooks.filter(book => book.status === 'Pending Validation').length;
        const slaWarnings = relevantProjects.filter(p => p.status === 'In Progress' && new Date(p.endDate) < new Date()).length;
        const today = new Date().toISOString().slice(0, 10);
        const processedToday = relevantAuditLogs.filter(d => d.date.startsWith(today)).length;

        const kpiData: KpiData[] = [
            { title: "Books in Workflow", value: booksInWorkflow.toLocaleString(), icon: BookCopy, description: "Active books across all stages" },
            { title: "Pending Client Action", value: pendingClientAction.toLocaleString(), icon: UserCheck, description: "Books awaiting client approval" },
            { title: "SLA Warnings", value: slaWarnings.toLocaleString(), icon: AlertTriangle, description: "Projects past their due date" },
            { title: "Actions Today", value: processedToday.toLocaleString(), icon: Activity, description: "Any action performed today" },
        ];

        const orderedStageNames = [
          'Pending Shipment', 'In Transit', 'To Scan', 'Scanning', 'Storage', 
          'To Indexing', 'Indexing', 'To Checking', 'Initial QC', 
          'Ready to Process', 'Processing', 'Processed', 'Final QC', 
          'Delivery', 'Client Validation', 'Rejections', 'Corrected', 
          'Complete', 'Archived'
        ];
        
        const chartStageMapping: { [key: string]: string } = {
          'Pending': 'Pending Shipment', 'In Transit': 'In Transit', 'To Scan': 'To Scan',
          'Scanning Started': 'Scanning', 'To Indexing': 'To Indexing', 'Indexing Started': 'Indexing',
          'To Checking': 'To Checking', 'Checking Started': 'Initial QC', 'In Processing': 'Processing',
          'Pending Validation': 'Client Validation', 'Client Rejected': 'Rejections', 'Corrected': 'Corrected',
          'Complete': 'Complete', 'Archived': 'Archived'
        };

        const booksByStage: { [key: string]: EnrichedBook[] } = {};

        const getBookDisplayStage = (book: EnrichedBook): string | null => {
            if (book.status === 'In Progress' && documents.some(d => d.bookId === book.id && d.status === 'Storage')) return 'Storage';
            if (book.status === 'Ready for Processing') return 'Ready to Process';
            const docStatuses = new Set(documents.filter(d => d.bookId === book.id).map(d => d.status));
            if (docStatuses.has('Processed')) return 'Processed';
            if (docStatuses.has('Final Quality Control')) return 'Final QC';
            if (docStatuses.has('Delivery')) return 'Delivery';
            if (docStatuses.has('In Processing')) return 'Processing';
            return chartStageMapping[book.status] || null;
        }

        relevantBooks.forEach(book => {
            const stageName = getBookDisplayStage(book);
            if (stageName && orderedStageNames.includes(stageName)) {
                if (!booksByStage[stageName]) booksByStage[stageName] = [];
                booksByStage[stageName].push(book);
            }
        });

        const chartData: ChartData[] = orderedStageNames.map(name => ({ name, count: booksByStage[name]?.length || 0 }));

        const dailyActivity: { [date: string]: { [action: string]: number } } = {};
        const sevenDaysAgo = subDays(new Date(), 6);

        const actionsToTrack: { [key: string]: string } = {
            'Book Shipped': 'Shipped', 'Reception Confirmed': 'Received', 'Scanning Finished': 'Scanned',
            'Indexing Started': 'Indexed', 'Checking Started': 'Checked', 'Processing Completed': 'Processed',
            'Client Approval': 'Finalized', 'Book Archived': 'Archived'
        };
        const actionKeys = Object.keys(actionsToTrack);

        relevantAuditLogs.filter(log => new Date(log.date) >= sevenDaysAgo && actionKeys.includes(log.action)).forEach(log => {
            const date = log.date.slice(0, 10);
            const actionName = actionsToTrack[log.action as keyof typeof actionsToTrack];
            if (!dailyActivity[date]) dailyActivity[date] = {};
            if (!dailyActivity[date][actionName]) dailyActivity[date][actionName] = 0;
            dailyActivity[date][actionName]++;
        });

        relevantAuditLogs.filter(log => new Date(log.date) >= sevenDaysAgo && log.details.includes('to Delivery')).forEach(log => {
            const date = log.date.slice(0, 10);
            if (!dailyActivity[date]) dailyActivity[date] = {};
            if (!dailyActivity[date]['Delivered']) dailyActivity[date]['Delivered'] = 0;
            dailyActivity[date]['Delivered']++;
        });

        const dateRange = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();

        const dailyChartData = dateRange.map(dateStr => {
            const dayData = dailyActivity[dateStr] || {};
            return {
                date: format(new Date(dateStr), 'MMM d'), fullDate: dateStr,
                Shipped: dayData.Shipped || 0, Received: dayData.Received || 0, Scanned: dayData.Scanned || 0,
                Indexed: dayData.Indexed || 0, Checked: dayData.Checked || 0, Processed: dayData.Processed || 0,
                Delivered: dayData.Delivered || 0, Finalized: dayData.Finalized || 0, Archived: dayData.Archived || 0,
            };
        });

        const recentActivities = relevantAuditLogs.slice(0, 7);
        const projectProgressData: ProjectProgressData[] = relevantProjects.map(p => ({
            id: p.id, name: p.name, client: p.clientName, progress: p.progress, status: p.status
        }));

        return { kpiData, chartData, dailyChartData, recentActivities, projectProgressData, selectedProjectId, booksByStage, allRelevantAuditLogs: relevantAuditLogs };
    }, [projects, books, documents, auditLogs, selectedProjectId]);

    const { kpiData, chartData, dailyChartData, recentActivities, projectProgressData, booksByStage, allRelevantAuditLogs } = dashboardData;
    
    const workflowChartConfig = { count: { label: "Books", color: "hsl(var(--primary))" } } satisfies ChartConfig;
    const ChartComponent = { bar: BarChart, line: LineChart, area: AreaChart }[chartType];
    const ChartElement = {
        bar: <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />,
        line: <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />,
        area: <Area type="monotone" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.3} />,
    }[chartType];

    const dailyChartConfig = {
      Shipped: { label: "Shipped", color: "hsl(var(--chart-1))" }, Received: { label: "Received", color: "hsl(var(--chart-2))" },
      Scanned: { label: "Scanned", color: "hsl(var(--chart-3))" }, Checked: { label: "Checked", color: "hsl(var(--chart-4))" },
      Processed: { label: "Processed", color: "hsl(var(--chart-5))" }, Delivered: { label: "Delivered", color: "hsl(200, 80%, 50%)" },
      Finalized: { label: "Finalized", color: "hsl(100, 80%, 50%)" },
    } satisfies ChartConfig;

    const handleCloseDetailDialog = () => {
      setDetailState({ open: false, title: '', items: [], type: null });
      setDetailFilter('');
    }

    const handleWorkflowChartClick = (data: any) => {
        if (!data || !data.activePayload?.length) return;
        const stageName = data.activePayload[0].payload.name as string;
        const booksForStage = booksByStage[stageName] || [];
        setDetailFilter('');
        setDetailState({ open: true, title: `Books in Stage: ${stageName}`, items: booksForStage, type: 'books' });
    };

    const handleDailyChartClick = (data: any) => {
        if (!data || !data.activePayload?.length) return;
        const fullDate = data.activePayload[0].payload.fullDate as string;
        if (!fullDate) return;
        const activitiesForDay = allRelevantAuditLogs.filter(log => log.date.startsWith(fullDate));
        setDetailFilter('');
        setDetailState({ open: true, title: `Activity for ${format(new Date(fullDate), 'MMMM d, yyyy')}`, items: activitiesForDay, type: 'activities' });
    };

    const filteredDialogItems = React.useMemo(() => {
        if (!detailState.open || !detailFilter) return detailState.items;
        const query = detailFilter.toLowerCase();
        if (detailState.type === 'books') {
            return (detailState.items as EnrichedBook[]).filter(book => book.name.toLowerCase().includes(query) || book.projectName.toLowerCase().includes(query) || book.clientName.toLowerCase().includes(query));
        }
        if (detailState.type === 'activities') {
            return (detailState.items as EnrichedAuditLog[]).filter(log => log.action.toLowerCase().includes(query) || log.details.toLowerCase().includes(query) || log.user.toLowerCase().includes(query));
        }
        return detailState.items;
    }, [detailState.items, detailState.type, detailFilter, detailState.open]);

    return (
      <>
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi) => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{kpi.value}</div><p className="text-xs text-muted-foreground">{kpi.description}</p></CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-6">
                <Card>
                     <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Workflow Overview</CardTitle>
                            <CardDescription>Number of books currently in each workflow phase. Click a bar for details.</CardDescription>
                        </div>
                        <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)} className="w-auto">
                            <TabsList><TabsTrigger value="bar">Bar</TabsTrigger><TabsTrigger value="line">Line</TabsTrigger><TabsTrigger value="area">Area</TabsTrigger></TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={workflowChartConfig} className="h-[300px] w-full cursor-pointer">
                             <ChartComponent data={chartData} onClick={handleWorkflowChartClick}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} angle={-40} textAnchor="end" height={80} interval={0} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                                <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent hideLabel />} />
                                {ChartElement}
                            </ChartComponent>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Daily Throughput</CardTitle>
                        <CardDescription>Count of books completing key stages over the last 7 days. Click the chart for details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={dailyChartConfig} className="h-[250px] w-full cursor-pointer">
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
                {!selectedProjectId && projectProgressData.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><ListTodo className="h-5 w-5" /> Project Health</CardTitle><CardDescription>Overview of all active and recently completed projects.</CardDescription></CardHeader>
                        <CardContent>
                            <Table><TableHeader><TableRow><TableHead>Project Name</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead className="w-[200px]">Progress</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {projectProgressData.map(project => (<TableRow key={project.id}><TableCell className="font-medium"><Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link></TableCell><TableCell>{project.client}</TableCell><TableCell><Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge></TableCell><TableCell><Progress value={project.progress} className="h-2"/></TableCell></TableRow>))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activity</CardTitle><CardDescription>Latest actions performed across the system.</CardDescription></CardHeader>
                    <CardContent>
                        <Table><TableHeader><TableRow><TableHead>Details</TableHead><TableHead>User</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {recentActivities.length > 0 ? recentActivities.map(activity => {
                                    const targetLink = activity.documentId ? `/documents/${activity.documentId}` : (activity.bookId ? `/books/${activity.bookId}` : '#');
                                    return (<TableRow key={activity.id}><TableCell><Link href={targetLink} className="font-medium truncate hover:underline">{activity.action}</Link><div className="text-xs text-muted-foreground truncate">{activity.details}</div></TableCell><TableCell>{activity.user}</TableCell><TableCell className="text-xs">{new Date(activity.date).toLocaleString()}</TableCell></TableRow>)
                                }) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No recent activity.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
        <Dialog open={detailState.open} onOpenChange={handleCloseDetailDialog}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{detailState.title}</DialogTitle>
                    <DialogDescription>Showing {filteredDialogItems.length} of {detailState.items.length} total items.</DialogDescription>
                </DialogHeader>
                <div className="py-2"><Input placeholder={detailState.type === 'books' ? "Filter by book, project, or client..." : "Filter by action, details, or user..."} value={detailFilter} onChange={(e) => setDetailFilter(e.target.value)} /></div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     {filteredDialogItems.length > 0 ? (
                        <>
                            {detailState.type === 'books' && (<Table><TableHeader><TableRow><TableHead>Book Name</TableHead><TableHead>Project</TableHead><TableHead>Client</TableHead></TableRow></TableHeader><TableBody>{(filteredDialogItems as EnrichedBook[]).map(book => (<TableRow key={book.id}><TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell><TableCell>{book.projectName}</TableCell><TableCell>{book.clientName}</TableCell></TableRow>))}</TableBody></Table>)}
                            {detailState.type === 'activities' && (<Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>User</TableHead><TableHead>Time</TableHead></TableRow></TableHeader><TableBody>{(filteredDialogItems as EnrichedAuditLog[]).map(log => (<TableRow key={log.id}><TableCell className="font-medium">{log.action}</TableCell><TableCell>{log.details}</TableCell><TableCell>{log.user}</TableCell><TableCell>{new Date(log.date).toLocaleTimeString()}</TableCell></TableRow>))}</TableBody></Table>)}
                        </>
                     ) : (<div className="text-center py-10 text-muted-foreground"><p>No items match your filter.</p></div>)}
                </div>
            </DialogContent>
        </Dialog>
      </>
    )
}

// --- CLIENT DASHBOARD ---

function ClientDashboard() {
    const { books, currentUser } = useAppContext();

    const clientData = useMemo(() => {
        if (!currentUser || !currentUser.clientId) {
            return { pendingShipping: [], inTransit: [], pendingValidation: [], completed: [], recentDeliveries: [] };
        }
        const clientBooks = books.filter(b => b.clientId === currentUser.clientId);
        
        const pendingShipping = clientBooks.filter(b => b.status === 'Pending');
        const inTransit = clientBooks.filter(b => b.status === 'In Transit');
        const pendingValidation = clientBooks.filter(b => b.status === 'Pending Validation');
        const completed = clientBooks.filter(b => b.status === 'Complete');

        return { pendingShipping, inTransit, pendingValidation, completed, recentDeliveries: completed.slice(0, 10) };
    }, [books, currentUser]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Batches Pending Shipping</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.pendingShipping.length}</div>
                        <p className="text-xs text-muted-foreground">Batches ready for you to send</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Batches In Transit</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.inTransit.length}</div>
                        <p className="text-xs text-muted-foreground">Batches you have shipped to us</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Batches Pending Approval</CardTitle>
                        <FileClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.pendingValidation.length}</div>
                        <p className="text-xs text-muted-foreground">Batches awaiting your review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Batches</CardTitle>
                        <CheckCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clientData.completed.length}</div>
                        <p className="text-xs text-muted-foreground">Total completed and validated batches</p>
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

// --- MAIN DASHBOARD ROUTER ---

export default function DashboardClient() {
    const { currentUser, selectedProjectId, projects } = useAppContext();

    if (!currentUser) {
        return <p>Loading user data...</p>;
    }

    const renderDashboard = () => {
        switch(currentUser.role) {
            case 'Admin':
                return <AdminDashboard />;
            case 'Client':
                return <ClientDashboard />;
            default:
                return (
                    <Card>
                        <CardHeader><CardTitle>Welcome</CardTitle></CardHeader>
                        <CardContent><p>Select an item from the menu to get started.</p></CardContent>
                    </Card>
                );
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                {selectedProjectId ? `${projects.find(p=>p.id === selectedProjectId)?.name} Dashboard` : (currentUser.role === 'Client' ? 'Client Dashboard' : 'My Dashboard')}
            </h1>
            {renderDashboard()}
        </div>
    )
}
