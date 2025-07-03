
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, BookCopy, CheckCircle2, UserCheck, BarChart2, ListTodo, Activity, TrendingUp } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedBook, AppDocument, EnrichedProject, EnrichedAuditLog } from "@/context/workflow-context"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { subDays, format } from "date-fns"


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

export default function DashboardClient() {
    const { projects, books, documents, auditLogs, selectedProjectId } = useAppContext();
    const [chartType, setChartType] = React.useState<'bar' | 'line' | 'area'>('bar');


    const dashboardData = useMemo(() => {
        const relevantProjects = selectedProjectId ? projects.filter(p => p.id === selectedProjectId) : projects;
        const relevantProjectIds = new Set(relevantProjects.map(p => p.id));
        const relevantBooks = books.filter(b => relevantProjectIds.has(b.projectId));
        const relevantDocuments = documents.filter(d => relevantProjectIds.has(d.projectId));
        const relevantAuditLogs = auditLogs.filter(log => log.bookId && relevantProjectIds.has(books.find(b => b.id === log.bookId)?.projectId || ''));
        
        // --- KPI Calculations ---
        const booksInWorkflow = relevantBooks.filter(b => !['Complete', 'Archived'].includes(b.status)).length;
        const pendingClientAction = relevantDocuments.filter(doc => doc.status === 'Pending Validation').length > 0
            ? new Set(relevantDocuments.filter(doc => doc.status === 'Pending Validation').map(doc => doc.bookId)).size
            : 0;
        const slaWarnings = relevantProjects.filter(p => p.status === 'In Progress' && new Date(p.endDate) < new Date()).length;
        const today = new Date().toISOString().slice(0, 10);
        const processedToday = relevantAuditLogs.filter(d => d.date.startsWith(today)).length;

        const kpiData: KpiData[] = [
            { title: "Books in Workflow", value: booksInWorkflow.toLocaleString(), icon: BookCopy, description: "Active books across all stages" },
            { title: "Pending Client Action", value: pendingClientAction.toLocaleString(), icon: UserCheck, description: "Books awaiting client approval" },
            { title: "SLA Warnings", value: slaWarnings.toLocaleString(), icon: AlertTriangle, description: "Projects past their due date" },
            { title: "Actions Today", value: processedToday.toLocaleString(), icon: Activity, description: "Any action performed today" },
        ];

        // --- Workflow Chart Calculation ---
        const chartStageMapping: { [key: string]: string } = {
            'Pending': 'Reception',
            'To Scan': 'To Scan',
            'Scanning Started': 'Scanning',
            'Storage': 'Storage',
            'To Indexing': 'To Indexing',
            'Indexing Started': 'Indexing',
            'To Checking': 'Initial QC',
            'Checking Started': 'Initial QC',
            'Ready for Processing': 'Ready to Process',
            'In Processing': 'Processing',
            'Processed': 'Processed',
            'Final Quality Control': 'Final QC',
            'Delivery': 'Delivery',
            'Pending Validation': 'Client Validation',
            'Client Rejected': 'Rejections',
        };

        const orderedStageNames = ['Reception', 'To Scan', 'Scanning', 'Storage', 'To Indexing', 'Indexing', 'Initial QC', 'Ready to Process', 'Processing', 'Processed', 'Final QC', 'Delivery', 'Client Validation', 'Rejections'];
        const bookStageCounts = Object.fromEntries(orderedStageNames.map(name => [name, 0]));

        relevantBooks.forEach(book => {
            const stageName = chartStageMapping[book.status];
            if (stageName) {
                bookStageCounts[stageName]++;
            }
        });

        const chartData: ChartData[] = orderedStageNames.map(name => ({
            name,
            count: bookStageCounts[name] || 0
        }));

        // --- Daily Throughput Chart ---
        const dailyActivity: { [date: string]: { [action: string]: number } } = {};
        const sevenDaysAgo = subDays(new Date(), 6);

        const actionsToTrack: { [key: string]: string } = {
            'Reception Confirmed': 'Received',
            'Scanning Finished': 'Scanned',
            'Processing Completed': 'Processed',
            'Client Approval': 'Finalized',
            'Book Archived': 'Archived'
        };
        const actionKeys = Object.keys(actionsToTrack);

        relevantAuditLogs
            .filter(log => new Date(log.date) >= sevenDaysAgo && actionKeys.includes(log.action))
            .forEach(log => {
                const date = log.date.slice(0, 10);
                const actionName = actionsToTrack[log.action as keyof typeof actionsToTrack];

                if (!dailyActivity[date]) dailyActivity[date] = {};
                if (!dailyActivity[date][actionName]) dailyActivity[date][actionName] = 0;
                dailyActivity[date][actionName]++;
            });

        relevantAuditLogs
            .filter(log => new Date(log.date) >= sevenDaysAgo && log.details.includes('to Delivery'))
            .forEach(log => {
                const date = log.date.slice(0, 10);
                if (!dailyActivity[date]) dailyActivity[date] = {};
                if (!dailyActivity[date]['Delivered']) dailyActivity[date]['Delivered'] = 0;
                dailyActivity[date]['Delivered']++;
            });

        const dateRange = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();

        const dailyChartData = dateRange.map(dateStr => {
            const dayData = dailyActivity[dateStr] || {};
            return {
                date: format(new Date(dateStr), 'MMM d'),
                Received: dayData.Received || 0,
                Scanned: dayData.Scanned || 0,
                Processed: dayData.Processed || 0,
                Delivered: dayData.Delivered || 0,
                Finalized: dayData.Finalized || 0,
                Archived: dayData.Archived || 0,
            };
        });

        // --- Table Data ---
        const recentActivities = relevantAuditLogs.slice(0, 7)
        const projectProgressData: ProjectProgressData[] = relevantProjects.map(p => ({
            id: p.id,
            name: p.name,
            client: p.clientName,
            progress: p.progress,
            status: p.status
        }));

        return { kpiData, chartData, dailyChartData, recentActivities, projectProgressData, selectedProjectId };
    }, [projects, books, documents, auditLogs, selectedProjectId]);

    const { kpiData, chartData, dailyChartData, recentActivities, projectProgressData } = dashboardData;
    
    const workflowChartConfig = {
      count: {
        label: "Books",
        color: "hsl(var(--primary))",
      },
    } satisfies ChartConfig

    const ChartComponent = {
        bar: BarChart,
        line: LineChart,
        area: AreaChart,
    }[chartType];

    const ChartElement = {
        bar: <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />,
        line: <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />,
        area: <Area type="monotone" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.3} />,
    }[chartType];

    const dailyChartConfig = {
      Received: { label: "Received", color: "hsl(var(--chart-1))" },
      Scanned: { label: "Scanned", color: "hsl(var(--chart-2))" },
      Processed: { label: "Processed", color: "hsl(var(--chart-3))" },
      Delivered: { label: "Delivered", color: "hsl(var(--chart-4))" },
      Finalized: { label: "Finalized", color: "hsl(var(--chart-5))" },
    } satisfies ChartConfig;


    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                {selectedProjectId ? `${projects.find(p=>p.id === selectedProjectId)?.name} Dashboard` : "Global Dashboard"}
            </h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi) => (
                    <Card key={kpi.title}>
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
            
            <div className="grid gap-6">
                <Card>
                     <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Workflow Overview</CardTitle>
                            <CardDescription>Number of books currently in each workflow phase.</CardDescription>
                        </div>
                        <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)} className="w-auto">
                            <TabsList>
                                <TabsTrigger value="bar">Bar</TabsTrigger>
                                <TabsTrigger value="line">Line</TabsTrigger>
                                <TabsTrigger value="area">Area</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={workflowChartConfig} className="h-[300px] w-full">
                             <ChartComponent data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} angle={-40} textAnchor="end" height={60} interval={0} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                                <ChartTooltip
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                {ChartElement}
                            </ChartComponent>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Daily Throughput</CardTitle>
                        <CardDescription>
                            Count of books completing key stages over the last 7 days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={dailyChartConfig} className="h-[250px] w-full">
                            <LineChart data={dailyChartData} margin={{ left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis allowDecimals={false} />
                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                {Object.keys(dailyChartConfig).map((key) => (
                                    <Line
                                        key={key}
                                        dataKey={key}
                                        type="monotone"
                                        stroke={`var(--color-${key})`}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activity</CardTitle>
                        <CardDescription>Latest actions performed across the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Details</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentActivities.length > 0 ? recentActivities.map(activity => {
                                    const targetLink = activity.documentId ? `/documents/${activity.documentId}` : (activity.bookId ? `/books/${activity.bookId}` : '#');
                                    return (
                                        <TableRow key={activity.id}>
                                            <TableCell>
                                                <Link href={targetLink} className="font-medium truncate hover:underline">{activity.action}</Link>
                                                <div className="text-xs text-muted-foreground truncate">{activity.details}</div>
                                            </TableCell>
                                            <TableCell>{activity.user}</TableCell>
                                            <TableCell className="text-xs">{new Date(activity.date).toLocaleString()}</TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No recent activity.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                {!selectedProjectId && projectProgressData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><ListTodo className="h-5 w-5" /> Project Health</CardTitle>
                            <CardDescription>Overview of all active and recently completed projects.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[200px]">Progress</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectProgressData.map(project => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/projects/${project.id}`} className="hover:underline">
                                                    {project.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{project.client}</TableCell>
                                            <TableCell><Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge></TableCell>
                                            <TableCell><Progress value={project.progress} className="h-2"/></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
