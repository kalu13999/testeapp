
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, BookCopy, UserCheck, BarChart2, Activity, TrendingUp, CheckCircle2 } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { useMemo } from "react"
import type { EnrichedAuditLog } from "@/context/workflow-context"
import type { EnrichedBook } from "@/lib/data"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { subDays, format } from "date-fns"
import { Input } from "@/components/ui/input"
import { ProjectStatsTab } from "./project-stats"
import { ClientStatsTab } from "./client-stats"
import { BookStatsTab } from "./book-stats"
import { OperationalUserStatsTab } from "./user-stats"
import { ClientUserStatsTab } from "./client-user-stats"
import { HistoryStatsTab } from "./history-stats"

type KpiData = {
    title: string;
    value: string;
    description: string;
    icon: React.ElementType;
    items: (EnrichedBook | EnrichedAuditLog)[];
    type: 'books' | 'activities' | null;
}

type ChartData = {
    name: string;
    count: number;
}

function SystemOverviewTab() {
  const { allProjects, auditLogs } = useAppContext();
    const [chartType, setChartType] = React.useState<'bar' | 'line' | 'area'>('bar');
    const [detailState, setDetailState] = React.useState<{
      open: boolean;
      title: string;
      items: (EnrichedBook | EnrichedAuditLog)[];
      type: 'books' | 'activities' | null;
    }>({ open: false, title: '', items: [], type: null });
    const [detailFilter, setDetailFilter] = React.useState('');

    const dashboardData = useMemo(() => {
        const books = allProjects.flatMap(p => p.books);
        
        const pendingClientActionBooks = books.filter(book => book.status === 'Pending Validation');
        const booksInWorkflowBooks = books.filter(b => !['Archived', 'Pending Shipment', 'Finalized', 'Complete'].includes(b.status));
        const finalizedBooks = books.filter(b => b.status === 'Finalized');
        const slaWarningProjects = allProjects.filter(p => p.status === 'In Progress' && new Date(p.endDate) < new Date());
        const slaWarningBooks = slaWarningProjects.flatMap(p => p.books.filter(book => book.status === 'In Progress'));
        const today = new Date().toISOString().slice(0, 10);
        const actionsTodayLogs = auditLogs.filter(d => d.date.startsWith(today));

        const kpiData: KpiData[] = [
            { title: "Livros no Fluxo de Trabalho", value: booksInWorkflowBooks.length.toLocaleString(), icon: BookCopy, description: "Todos os livros ativos em processamento", items: booksInWorkflowBooks, type: 'books' },
            { title: "Livros Finalizados", value: finalizedBooks.length.toLocaleString(), icon: CheckCircle2, description: "Livros que foram aprovados", items: finalizedBooks, type: 'books' },
            { title: "Ação do Cliente Pendente", value: pendingClientActionBooks.length.toLocaleString(), icon: UserCheck, description: "Lotes a aguardar aprovação do cliente", items: pendingClientActionBooks, type: 'books' },
            { title: "Avisos de SLA", value: slaWarningProjects.length.toLocaleString(), icon: AlertTriangle, description: "Projetos além do prazo", items: slaWarningBooks, type: 'books' },
            { title: "Ações Hoje", value: actionsTodayLogs.length.toLocaleString(), icon: Activity, description: "Qualquer ação realizada hoje", items: actionsTodayLogs, type: 'activities' },
        ];

        const orderedStageNames = [
          'In Transit', 'Received', 'To Scan', 'Scanning Started', 'Storage', 'To Indexing', 'Indexing Started', 'To Checking', 'Checking Started', 'Ready for Processing', 'In Processing', 'Processed', 'Final Quality Control', 'Delivery', 'Pending Validation', 'Client Rejected', 'Corrected', 'Finalized'
        ];
        
        const booksByStage: { [key: string]: EnrichedBook[] } = {};
        books.forEach(book => {
            const stageName = book.status;
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
            'Initial QC Complete': 'Checked', 'Processing Completed': 'Processed',
            'Client Approval': 'Finalized', 'Book Archived': 'Archived'
        };
        const actionKeys = Object.keys(actionsToTrack);

        auditLogs.filter(log => new Date(log.date) >= sevenDaysAgo && actionKeys.includes(log.action)).forEach(log => {
            const date = log.date.slice(0, 10);
            const actionName = actionsToTrack[log.action as keyof typeof actionsToTrack];
            if (!dailyActivity[date]) dailyActivity[date] = {};
            if (!dailyActivity[date][actionName]) dailyActivity[date][actionName] = 0;
            dailyActivity[date][actionName]++;
        });

        auditLogs.filter(log => new Date(log.date) >= sevenDaysAgo && log.action === 'Workflow Step' && log.details?.includes('to Delivery')).forEach(log => {
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
                Checked: dayData.Checked || 0, Processed: dayData.Processed || 0,
                Delivered: dayData.Delivered || 0, Finalized: dayData.Finalized || 0, Archived: dayData.Archived || 0,
            };
        });

        return { kpiData, chartData, dailyChartData, booksByStage, allRelevantAuditLogs: auditLogs };
    }, [allProjects, auditLogs]);

    const { kpiData, chartData, dailyChartData, booksByStage, allRelevantAuditLogs } = dashboardData;
    
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

    const handleKpiClick = (kpi: KpiData) => {
        if (!kpi.items || kpi.items.length === 0 || !kpi.type) return;
        setDetailFilter('');
        setDetailState({
            open: true,
            title: `Detalhes de: ${kpi.title}`,
            items: kpi.items,
            type: kpi.type
        });
    };

    const handleCloseDetailDialog = () => {
      setDetailFilter('');
      setDetailState({ open: false, title: '', items: [], type: null });
    }

    const handleWorkflowChartClick = (data: any) => {
        if (!data || !data.activePayload?.length) return;
        const stageName = data.activePayload[0].payload.name as string;
        const booksForStage = booksByStage[stageName] || [];
        setDetailFilter('');
        setDetailState({ open: true, title: `Livros no Estado: ${stageName}`, items: booksForStage, type: 'books' });
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
            return (detailState.items as EnrichedAuditLog[]).filter(log => log.action.toLowerCase().includes(query) || (log.details || '').toLowerCase().includes(query) || log.user.toLowerCase().includes(query));
        }
        return detailState.items;
    }, [detailState.items, detailState.type, detailFilter, detailState.open]);

    return (
      <>
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {kpiData.map((kpi) => (
                    <Card key={kpi.title} onClick={() => handleKpiClick(kpi)} className={kpi.items && kpi.items.length > 0 ? "cursor-pointer transition-colors hover:bg-muted/50" : ""}>
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
                            <CardTitle className="font-headline flex items-center gap-2"><BarChart2 className="h-5 w-5"/>Visão Geral do Fluxo de Trabalho</CardTitle>
                            <CardDescription>Número de livros atualmente em cada fase do fluxo de trabalho em todos os projetos. Clique em uma barra para detalhes.</CardDescription>
                        </div>
                        <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)} className="w-auto">
                            <TabsList><TabsTrigger value="bar">Barras</TabsTrigger><TabsTrigger value="line">Linhas</TabsTrigger><TabsTrigger value="area">Área</TabsTrigger></TabsList>
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
                        <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5"/>Produção Diária</CardTitle>
                        <CardDescription>Contagem de livros que completam etapas-chave nos últimos 7 dias. Clique no gráfico para detalhes.</CardDescription>
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
            </div>
        </div>

        <Dialog open={detailState.open} onOpenChange={handleCloseDetailDialog}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{detailState.title}</DialogTitle>
                    <DialogDescription>A mostrar {filteredDialogItems.length} de {detailState.items.length} itens totais.</DialogDescription>
                </DialogHeader>
                <div className="py-2"><Input placeholder={detailState.type === 'books' ? "Filtrar por livro, projeto ou cliente..." : "Filtrar por ação, detalhes ou utilizador..."} value={detailFilter} onChange={(e) => setDetailFilter(e.target.value)} /></div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     {filteredDialogItems.length > 0 ? (
                        <>
                            {detailState.type === 'books' && (<Table><TableHeader><TableRow><TableHead>Nome do Livro</TableHead><TableHead>Projeto</TableHead><TableHead>Cliente</TableHead></TableRow></TableHeader><TableBody>{(filteredDialogItems as EnrichedBook[]).map(book => (<TableRow key={book.id}><TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell><TableCell>{book.projectName}</TableCell><TableCell>{book.clientName}</TableCell></TableRow>))}</TableBody></Table>)}
                            {detailState.type === 'activities' && (<Table><TableHeader><TableRow><TableHead>Ação</TableHead><TableHead>Detalhes</TableHead><TableHead>Utilizador</TableHead><TableHead>Hora</TableHead></TableRow></TableHeader><TableBody>{(filteredDialogItems as EnrichedAuditLog[]).map(log => (<TableRow key={log.id}><TableCell className="font-medium">{log.action}</TableCell><TableCell>{log.details}</TableCell><TableCell>{log.user}</TableCell><TableCell>{new Date(log.date).toLocaleTimeString()}</TableCell></TableRow>))}</TableBody></Table>)}
                        </>
                     ) : (<div className="text-center py-10 text-muted-foreground"><p>Nenhum item corresponde ao seu filtro.</p></div>)}
                </div>
            </DialogContent>
        </Dialog>
      </>
    )
}

export default function GlobalOverviewClient() {
  return (
    <div className="flex flex-col gap-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Resumo Global</h1>
        <Tabs defaultValue="system">
            <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="system">Sistema</TabsTrigger>
                <TabsTrigger value="projects">Por Projeto</TabsTrigger>
                <TabsTrigger value="books">Por Livro</TabsTrigger>
                <TabsTrigger value="clients">Por Cliente</TabsTrigger>
                <TabsTrigger value="operators">Por Operador</TabsTrigger>
                <TabsTrigger value="client-users">Por Utilizador do Cliente</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="system" className="pt-4">
                <SystemOverviewTab />
            </TabsContent>
            <TabsContent value="projects" className="pt-4">
                <ProjectStatsTab />
            </TabsContent>
            <TabsContent value="books" className="pt-4">
                <BookStatsTab />
            </TabsContent>
            <TabsContent value="clients" className="pt-4">
                <ClientStatsTab />
            </TabsContent>
            <TabsContent value="operators" className="pt-4">
                <OperationalUserStatsTab />
            </TabsContent>
            <TabsContent value="client-users" className="pt-4">
                <ClientUserStatsTab />
            </TabsContent>
            <TabsContent value="history" className="pt-4">
                <HistoryStatsTab />
            </TabsContent>
        </Tabs>
    </div>
  )
}
