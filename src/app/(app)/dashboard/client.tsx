
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
import { Progress } from "@/components/ui/progress"
import { BookCopy, BarChart2, ListTodo, Package, Send, FileClock, ArrowDownToLine, CheckCheck } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedBook, EnrichedProject } from "@/context/workflow-context"
import Link from "next/link"


function ProjectDashboard() {
    const { projects, selectedProjectId } = useAppContext();

    const project = useMemo(() => {
        if (!selectedProjectId) return null;
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

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
    
    const kpis = [
        { title: "Total Books", value: project.books.length.toLocaleString(), icon: BookCopy },
        { title: "Pending Shipment", value: project.books.filter(b => b.status === 'Pending Shipment').length.toLocaleString(), icon: Package },
        { title: "In Transit", value: project.books.filter(b => b.status === 'In Transit').length.toLocaleString(), icon: Send },
        { title: "Finalized", value: project.books.filter(b => b.status === 'Finalized').length.toLocaleString(), icon: CheckCheck },
    ]

    const chartData = project.books
        .reduce((acc, book) => {
            const status = book.status;
            const existing = acc.find(item => item.name === status);
            if (existing) {
                existing.count++;
            } else {
                acc.push({ name: status, count: 1 });
            }
            return acc;
        }, [] as { name: string, count: number }[])
        .sort((a,b) => b.count - a.count);

    const chartConfig = { count: { label: "Books", color: "hsl(var(--primary))" } } satisfies ChartConfig;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Books by Status</CardTitle>
                        <CardDescription>Current status of all books within this project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
                                <XAxis type="number" dataKey="count" allowDecimals={false} />
                                <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent hideLabel />} />
                                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><ListTodo className="h-5 w-5" /> Book Progress</CardTitle>
                        <CardDescription>Detailed progress for each book in the project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Book Name</TableHead><TableHead>Status</TableHead><TableHead className="w-[150px]">Progress</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {project.books.slice(0, 10).map(book => (
                                    <TableRow key={book.id}>
                                        <TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell>
                                        <TableCell><Badge variant="outline">{book.status}</Badge></TableCell>
                                        <TableCell><Progress value={book.progress} className="h-2"/></TableCell>
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
