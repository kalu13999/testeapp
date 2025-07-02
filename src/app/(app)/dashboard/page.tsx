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

const kpiData = [
    { title: "Pending Documents", value: "1,204", icon: FileClock, description: "Waiting for processing" },
    { title: "SLA Warnings", value: "32", icon: AlertTriangle, description: "Approaching deadline" },
    { title: "Processed Today", value: "893", icon: CheckCircle2, description: "Successfully completed" },
    { title: "Total in Workflow", value: "8,451", icon: Files, description: "Across all stages" },
];

const chartData = [
    { name: "Jan", approved: 400, rejected: 240 },
    { name: "Feb", approved: 300, rejected: 139 },
    { name: "Mar", approved: 500, rejected: 800 },
    { name: "Apr", approved: 278, rejected: 390 },
    { name: "May", approved: 189, rejected: 480 },
    { name: "Jun", approved: 239, rejected: 380 },
];

const recentActivities = [
    { id: "DOC-0824", client: "Innovate Corp", status: "QC Pending", stage: "Quality Control" },
    { id: "DOC-0823", client: "Future Tech", status: "Delivered", stage: "Delivery" },
    { id: "DOC-0822", client: "Data Systems", status: "Processing", stage: "Processing" },
    { id: "DOC-0821", client: "Innovate Corp", status: "Indexing", stage: "Indexing" },
    { id: "DOC-0820", client: "Quantum Leap", status: "Scanned", stage: "Scanning" },
];


export default function DashboardPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Internal Dashboard</h1>

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
                                        <TableCell className="font-medium">{activity.id}</TableCell>
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
