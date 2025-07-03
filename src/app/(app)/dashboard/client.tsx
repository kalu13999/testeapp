
"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, CheckCircle2, FileClock, Files } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"

// A map to associate KPI titles with icons
const iconMap: { [key: string]: React.ElementType } = {
    "Pending Documents": FileClock,
    "SLA Warnings": AlertTriangle,
    "Processed Today": CheckCircle2,
    "Total in Workflow": Files,
};

type KpiData = {
    title: string;
    value: string;
    description: string;
}

type ChartData = {
    name: string;
    approved: number;
    rejected: number;
}

type RecentActivity = {
    id: string;
    client: string;
    status: string;
}

export default function DashboardClient() {
    const { documents, projects } = useAppContext();

    const dashboardData = useMemo(() => {
        const pendingCount = documents.filter(d => ['Quality Control', 'Final Quality Control', 'Processing', 'Indexing'].includes(d.status)).length;
        const slaWarningsCount = projects.filter(p => p.progress < 50 && p.status === 'In Progress').length;
        const processedTodayCount = documents.filter(d => d.lastUpdated === new Date().toISOString().slice(0, 10)).length;
        const totalCount = documents.length;

        const kpiData: KpiData[] = [
            { title: "Pending Documents", value: pendingCount.toLocaleString(), description: "Awaiting processing" },
            { title: "SLA Warnings", value: slaWarningsCount.toLocaleString(), description: "Projects with low progress" },
            { title: "Processed Today", value: processedTodayCount.toLocaleString(), description: "Docs updated today" },
            { title: "Total in Workflow", value: totalCount.toLocaleString(), description: "Across all stages" },
        ];

        const recentActivities: RecentActivity[] = documents
            .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
            .slice(0, 5)
            .map(doc => ({
                id: doc.id,
                client: doc.client,
                status: doc.status
            }));

        const monthlyStats: { [key: string]: { approved: number, rejected: number } } = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        documents.forEach(doc => {
            const date = new Date(doc.lastUpdated);
            const monthKey = monthNames[date.getMonth()];
            if (!monthKey) return;

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = { approved: 0, rejected: 0 };
            }

            if (doc.status === 'Finalized' || doc.status === 'Archived') {
                monthlyStats[monthKey].approved += 1;
            } else if (doc.status === 'Client Rejected') {
                monthlyStats[monthKey].rejected += 1;
            }
        });

        const chartData: ChartData[] = monthNames.map(name => ({
            name,
            approved: monthlyStats[name]?.approved || 0,
            rejected: monthlyStats[name]?.rejected || 0,
        })).slice(0, 6);

        return { kpiData, chartData, recentActivities };
    }, [documents, projects]);

    const { kpiData, chartData, recentActivities } = dashboardData;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Internal Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi) => {
                    const Icon = iconMap[kpi.title] || Files;
                    return (
                        <Card key={kpi.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground">{kpi.description}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-headline">Monthly Performance</CardTitle>
                        <CardDescription>Document approval vs. rejection rates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                <Bar dataKey="approved" fill="hsl(var(--primary))" name="Approved" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="rejected" fill="hsl(var(--accent))" name="Rejected" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Recent Activity</CardTitle>
                        <CardDescription>Documents that recently moved stages.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentActivities.map(activity => (
                                    <TableRow key={activity.id}>
                                        <TableCell className="font-medium">{activity.id.split('_').pop() || activity.id}</TableCell>
                                        <TableCell>{activity.client}</TableCell>
                                        <TableCell><Badge variant="outline">{activity.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
