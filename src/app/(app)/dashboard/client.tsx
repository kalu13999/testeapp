
"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
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
import { AlertTriangle, BookCopy, CheckCircle2, UserCheck, BarChart2, ListTodo, Activity } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedBook, AppDocument, EnrichedProject, EnrichedAuditLog } from "@/context/workflow-context"
import Link from "next/link"

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

        // --- Chart Data Calculation ---
        const workflowStages: { [key: string]: string[] } = {
            'Reception': ['Pending', 'To Scan'],
            'Scanning': ['Scanning Started', 'Scanned'],
            'Processing': ['Storage', 'Indexing', 'Quality Control', 'Ready for Processing', 'In Processing', 'Processed'],
            'Final Review': ['Final Quality Control', 'Delivery', 'Pending Validation'],
            'Correction': ['Client Rejected', 'Corrected'],
        };

        const bookStageCounts = Object.fromEntries(Object.keys(workflowStages).map(k => [k, 0]));
        
        relevantBooks.forEach(book => {
            for (const [stage, statuses] of Object.entries(workflowStages)) {
                if (statuses.includes(book.status)) {
                    bookStageCounts[stage]++;
                    return;
                }
            }
            // Fallback for document-level status checks if book status is generic like 'In Progress'
            const bookDocs = relevantDocuments.filter(d => d.bookId === book.id);
            if (bookDocs.length > 0) {
                 const docStatus = bookDocs[0].status;
                 for (const [stage, statuses] of Object.entries(workflowStages)) {
                    if (statuses.includes(docStatus)) {
                        bookStageCounts[stage]++;
                        return;
                    }
                }
            }
        });

        const chartData: ChartData[] = Object.entries(bookStageCounts).map(([name, count]) => ({ name, count }));

        // --- Table Data ---
        const recentActivities = relevantAuditLogs.slice(0, 7)

        const projectProgressData: ProjectProgressData[] = relevantProjects.map(p => ({
            id: p.id,
            name: p.name,
            client: p.clientName,
            progress: p.progress,
            status: p.status
        }));

        return { kpiData, chartData, recentActivities, projectProgressData, selectedProjectId };
    }, [projects, books, documents, auditLogs, selectedProjectId]);

    const { kpiData, chartData, recentActivities, projectProgressData } = dashboardData;

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

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Workflow Overview</CardTitle>
                    <CardDescription>Number of books currently in each major workflow phase.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                            <Tooltip
                                cursor={{ fill: "hsl(var(--muted))" }}
                                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" name="Books" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
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
    )
}
