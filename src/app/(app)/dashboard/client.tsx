
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, BookCopy, BarChart2, ListTodo, Package, Send, FileClock, ArrowDownToLine, CheckCheck, TrendingUp, Activity, UserCheck, ShieldAlert } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedBook, EnrichedProject, EnrichedAuditLog, AppDocument } from "@/context/workflow-context"
import Link from "next/link"
import { subDays, format } from "date-fns"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    const [chartType, setChartType] = React.useState<'bar' | 'line' | 'area'>('bar');
    const [detailState, setDetailState] = React.useState<{ open: boolean; title: string; items: (EnrichedBook | EnrichedAuditLog)[]; type: 'books' | 'activities' | null; }>({ open: false, title: '', items: [], type: null });
    const [detailFilter, setDetailFilter] = React.useState('');
    
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
        if (!project) return { kpiData: [], workflowChartData: [], dailyChartData: [], recentActivities: [], booksByStage: {}, allRelevantAuditLogs: [] };
        
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
            { title: "Pending Shipping", value: pendingShippingBooks.length.toLocaleString(), icon: Package, description: "Books awaiting client shipment", items: pendingShippingBooks, type: 'books' },
            { title: "In Transit", value: inTransitBooks.length.toLocaleString(), icon: Send, description: "Books shipped by the client", items: inTransitBooks, type: 'books' },
            { title: "Received by Us", value: receivedBooks.length.toLocaleString(), icon: ArrowDownToLine, description: "Books confirmed at our facility", items: receivedBooks, type: 'books' },
            { title: "Pending Client Action", value: pendingValidationBooks.length.toLocaleString(), icon: UserCheck, description: "Books awaiting client approval", items: pendingValidationBooks, type: 'books' },
            { title: "Books in Workflow", value: workflowBooks.length.toLocaleString(), icon: BookCopy, description: "Active books being processed", items: workflowBooks, type: 'books' },
            { title: "Finalized Books", value: finalizedBooks.length.toLocaleString(), icon: CheckCheck, description: "Books that are approved", items: finalizedBooks, type: 'books' },
            { title: "Document Errors", value: errorDocs.length.toLocaleString(), icon: ShieldAlert, description: "Pages flagged with errors", items: booksWithErrors, type: 'books' },
            { title: "Document Warnings", value: warningDocs.length.toLocaleString(), icon: AlertTriangle, description: "Pages flagged with warnings", items: booksWithWarnings, type: 'books' },
            { title: "Actions Today", value: actionsTodayLogs.length.toLocaleString(), icon: Activity, description: "Actions recorded today", items: actionsTodayLogs, type: 'activities' },
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
        const sevenDaysAgo = subDays(new Date(), 6);
        const actionsToTrack: { [key: string]: string } = { 'Scanning Finished': 'Scanned', 'Initial QC Complete': 'Checked', 'Processing Completed': 'Processed', 'Client Approval': 'Finalized' };
        projectLogs.filter(log => new Date(log.date) >= sevenDaysAgo && Object.keys(actionsToTrack).includes(log.action)).forEach(log => {
            const date = log.date.slice(0, 10);
            const actionName = actionsToTrack[log.action as keyof typeof actionsToTrack];
            if (!dailyActivity[date]) dailyActivity[date] = {};
            if (!dailyActivity[date][actionName]) dailyActivity[date][actionName] = 0;
            dailyActivity[date][actionName]++;
        });
        const dateRange = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
        const dailyChartData = dateRange.map(dateStr => ({
            date: format(new Date(dateStr), 'MMM d'), fullDate: dateStr,
            ...Object.fromEntries(Object.values(actionsToTrack).map(val => [val, (dailyActivity[dateStr] || {})[val] || 0]))
        }));
        
        const recentActivities = projectLogs.slice(0, 7);

        return { kpiData, workflowChartData, dailyChartData, recentActivities, booksByStage, allRelevantAuditLogs: projectLogs };
    }, [project, auditLogs, documents]);

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
    
    const { kpiData, workflowChartData, dailyChartData, recentActivities } = dashboardData;
    const workflowChartConfig = { count: { label: "Books", color: "hsl(var(--primary))" } } satisfies ChartConfig;
    const ChartComponent = { bar: BarChart, line: LineChart, area: AreaChart }[chartType];
    const ChartElement = {
        bar: <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />,
        line: <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />,
        area: <Area type="monotone" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.3} />,
    }[chartType];
    const dailyChartConfig = { Scanned: { label: "Scanned", color: "hsl(var(--chart-3))" }, Checked: { label: "Checked", color: "hsl(var(--chart-4))" }, Processed: { label: "Processed", color: "hsl(var(--chart-5))" }, Finalized: { label: "Finalized", color: "hsl(100, 80%, 50%)" } } satisfies ChartConfig;

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
                   <CardHeader>
                       <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Daily Throughput</CardTitle>
                       <CardDescription>Count of books completing key stages over the last 7 days. Click for details.</CardDescription>
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
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle className="font-headline flex items-center gap-2"><ListTodo className="h-5 w-5" /> Book Progress</CardTitle><CardDescription>Detailed progress for each book in the project.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Book Name</TableHead><TableHead>Status</TableHead><TableHead className="w-[150px]">Progress</TableHead></TableRow></TableHeader><TableBody>{project.books.length > 0 ? project.books.slice(0, 10).map(book => (<TableRow key={book.id}><TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell><TableCell><Badge variant="outline">{book.status}</Badge></TableCell><TableCell><Progress value={book.progress} className="h-2"/></TableCell></TableRow>)) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No books in this project.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
                    <Card><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activity</CardTitle><CardDescription>Latest actions performed in this project.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Details</TableHead><TableHead>User</TableHead><TableHead className="text-right">Date</TableHead></TableRow></TableHeader><TableBody>{recentActivities.length > 0 ? recentActivities.map(activity => (<TableRow key={activity.id}><TableCell><Link href={`/books/${activity.bookId}`} className="font-medium truncate hover:underline">{activity.action}</Link><div className="text-xs text-muted-foreground truncate">{activity.details}</div></TableCell><TableCell>{activity.user}</TableCell><TableCell className="text-xs text-right">{new Date(activity.date).toLocaleDateString()}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No recent activity for this project.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
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

    