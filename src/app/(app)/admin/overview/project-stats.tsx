
"use client"

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
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ChevronsUpDown, Download, Briefcase, Clock, CheckCircle, CircleOff } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import Link from "next/link"
import type { EnrichedProject } from "@/lib/data"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"


const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'On Hold': return 'outline';
        default: return 'outline';
    }
}

export function ProjectStatsTab() {
  const { allProjects, documents } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: EnrichedProject[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');
  const { toast } = useToast();
/*
  const projectStats = React.useMemo(() => {
    return allProjects.map(project => {
      const errorDocs = new Set(documents.filter(d => d.projectId === project.id && d.flag === 'error').map(d => d.bookId));
      const finalizedBooks = project.books.filter(b => b.status === 'Finalized').length;
      return {
        ...project,
        errorBooksCount: errorDocs.size,
        finalizedBooksCount: finalizedBooks,
        timeline: `${format(new Date(project.startDate), "LLL d, y")} to ${format(new Date(project.endDate), "LLL d, y")}`,
      }
    })
  }, [allProjects, documents])
  
  const kpiData = React.useMemo(() => ({
      total: { value: allProjects.length, items: allProjects },
      inProgress: { value: allProjects.filter(p => p.status === 'In Progress').length, items: allProjects.filter(p => p.status === 'In Progress') },
      onHold: { value: allProjects.filter(p => p.status === 'On Hold').length, items: allProjects.filter(p => p.status === 'On Hold') },
      complete: { value: allProjects.filter(p => p.status === 'Complete').length, items: allProjects.filter(p => p.status === 'Complete') },
  }), [allProjects]);

  const projectsByStatusChartData = React.useMemo(() => ([
    { name: 'In Progress', value: kpiData.inProgress.value, fill: "hsl(var(--chart-2))" },
    { name: 'On Hold', value: kpiData.onHold.value, fill: "hsl(var(--chart-3))" },
    { name: 'Complete', value: kpiData.complete.value, fill: "hsl(var(--chart-1))" },
  ]), [kpiData]);
  
  const booksPerProjectChartData = React.useMemo(() => (
    allProjects.map(p => ({
      name: p.name,
      books: p.books.length,
    })).sort((a,b) => b.books - a.books).slice(0, 10) // Top 10 projects
  ), [allProjects]);
  */

  type ProjectStats = EnrichedProject & {
  finalizedBooksCount: number;
  errorBooksCount: number;
  timeline: string;
};

const [projectStats, setProjectStats] = React.useState<ProjectStats[]>([]); // substitua ProjectStatsType pelo tipo correto

React.useEffect(() => {
  const stats = allProjects.map(project => {
    const errorDocs = new Set(
      documents
        .filter(d => d.projectId === project.id && d.flag === 'error')
        .map(d => d.bookId)
    );

    const finalizedBooks = project.books.filter(b => b.status === 'Finalized').length;

    return {
      ...project,
      errorBooksCount: errorDocs.size,
      finalizedBooksCount: finalizedBooks,
      timeline: `${format(new Date(project.startDate), "LLL d, y")} to ${format(new Date(project.endDate), "LLL d, y")}`,
    };
  });

  setProjectStats(stats);
}, [allProjects, documents]);

  const chartConfig: ChartConfig = {
    books: { label: "Books", color: "hsl(var(--chart-1))" },
  };

type KpiEntry = {
  value: number;
  items: EnrichedProject[];
};

type KpiData = {
  total: KpiEntry;
  inProgress: KpiEntry;
  onHold: KpiEntry;
  complete: KpiEntry;
};

const [kpiData, setKpiData] = React.useState<KpiData>({
  total: { value: 0, items: [] },
  inProgress: { value: 0, items: [] },
  onHold: { value: 0, items: [] },
  complete: { value: 0, items: [] },
});

React.useEffect(() => {
  const inProgressItems = allProjects.filter(p => p.status === 'In Progress');
  const onHoldItems = allProjects.filter(p => p.status === 'On Hold');
  const completeItems = allProjects.filter(p => p.status === 'Complete');

  setKpiData({
    total: { value: allProjects.length, items: allProjects },
    inProgress: { value: inProgressItems.length, items: inProgressItems },
    onHold: { value: onHoldItems.length, items: onHoldItems },
    complete: { value: completeItems.length, items: completeItems },
  });
}, [allProjects]);

type ChartDataItem = {
  name: string;
  value: number;
  fill: string;
};
const [projectsByStatusChartData, setProjectsByStatusChartData] = React.useState<ChartDataItem[]>([]);


React.useEffect(() => {
  setProjectsByStatusChartData([
    { name: 'In Progress', value: kpiData.inProgress.value, fill: "hsl(var(--chart-2))" },
    { name: 'On Hold', value: kpiData.onHold.value, fill: "hsl(var(--chart-3))" },
    { name: 'Complete', value: kpiData.complete.value, fill: "hsl(var(--chart-1))" },
  ]);
}, [kpiData]);


type BooksPerProjectChartItem = {
  name: string;
  books: number;
};

const [booksPerProjectChartData, setBooksPerProjectChartData] = React.useState<BooksPerProjectChartItem[]>([]);

React.useEffect(() => {
  const chartData = allProjects
    .map(p => ({
      name: p.name,
      books: p.books.length,
    }))
    .sort((a, b) => b.books - a.books)
    .slice(0, 10);

  setBooksPerProjectChartData(chartData);
}, [allProjects]);



  const handleSort = (columnId: string) => {
    setSorting(currentSorting => {
      if (currentSorting.length > 0 && currentSorting[0].id === columnId) {
        return [{ id: columnId, desc: !currentSorting[0].desc }]
      }
      return [{ id: columnId, desc: false }]
    })
  }

  

  const getSortIndicator = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId)
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />
  }

  const sortedAndFilteredProjects = React.useMemo(() => {
    let filtered = projectStats;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(project => {
          const projectValue = project[columnId as keyof typeof project]
          return String(projectValue).toLowerCase().includes(value.toLowerCase())
        })
      }
    })



    if (sorting.length > 0) {
      filtered.sort((a, b) => {
        const s = sorting[0]
        const valA = a[s.id as keyof typeof a]
        const valB = b[s.id as keyof typeof b]
        let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
        if (result !== 0) return s.desc ? -result : result
        return 0
      })
    }
    return filtered
  }, [projectStats, columnFilters, sorting])

  /*const [sortedAndFilteredProjects, setSortedAndFilteredProjects] = React.useState<ProjectStats[]>([]); // substitua pelo tipo correto

  React.useEffect(() => {
    let filtered = projectStats;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(project => {
          const projectValue = project[columnId as keyof typeof project];
          return String(projectValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const s = sorting[0];
        const valA = a[s.id as keyof typeof a];
        const valB = b[s.id as keyof typeof b];
        const result = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        return s.desc ? -result : result;
      });
    }

    setSortedAndFilteredProjects(filtered);
  }, [projectStats, columnFilters, sorting]);*/


  const filteredDialogItems = React.useMemo(() => {
    if (!dialogFilter) return dialogState.items;
    const query = dialogFilter.toLowerCase();
    return dialogState.items.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.clientName.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query)
    );
  }, [dialogState.items, dialogFilter]);

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const exportData = (format: 'xlsx' | 'json' | 'csv') => {
    const data = sortedAndFilteredProjects;
    if (format === 'json') {
        downloadFile(JSON.stringify(data, null, 2), 'projects.json', 'application/json');
    } else if (format === 'csv') {
        const headers = ['id', 'name', 'clientName', 'status', 'timeline', 'progress', 'documentCount', 'totalExpected', 'finalizedBooksCount', 'errorBooksCount'];
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'projects.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
        XLSX.writeFile(workbook, 'projects.xlsx');
    }
    toast({ title: "Exportação Concluída", description: `${data.length} projetos exportados.` });
  };
  
  const handleKpiClick = (title: string, items: EnrichedProject[]) => {
    setDialogFilter('');
    setDialogState({ open: true, title, items });
  }

  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Total Projetos', allProjects)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Projetos</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.total.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Projetos em Execução', kpiData.inProgress.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Em Execução</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.inProgress.value}</div></CardContent>
            </Card>
             <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Projetos em Espera', kpiData.onHold.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Em Espera</CardTitle><CircleOff className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.onHold.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Projetos Concluídos', kpiData.complete.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Concluído</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.complete.value}</div></CardContent>
            </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Projetos por Estado</CardTitle></CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="h-[250px] w-full">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={projectsByStatusChartData} dataKey="value" nameKey="name" innerRadius={50} />
                            <Legend/>
                        </PieChart>
                     </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top 10 Projetos por Contagem de Livros</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={booksPerProjectChartData} layout="vertical" margin={{ left: 50 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={120} />
                            <XAxis dataKey="books" type="number" hide />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                            <Bar dataKey="books" radius={4} fill="var(--color-books)" />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Todos os Projetos</CardTitle>
              <CardDescription>Uma lista detalhada de todos os projetos no sistema.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Exportar</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Exportar Dados</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => exportData('xlsx')}>Exportar como XLSX</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportData('json')}>Exportar como JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportData('csv')}>Exportar como CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Nome do Projeto {getSortIndicator('name')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('clientName')}>Cliente {getSortIndicator('clientName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}>Estado {getSortIndicator('status')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('timeline')}>Linha do Tempo {getSortIndicator('timeline')}</div></TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalExpected')}>Total de Páginas {getSortIndicator('totalExpected')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('finalizedBooksCount')}>Livros Finalizados {getSortIndicator('finalizedBooksCount')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('errorBooksCount')}>Livros com Erros {getSortIndicator('errorBooksCount')}</div></TableHead>
              </TableRow>
              <TableRow>
                <TableHead><Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar cliente..." value={columnFilters['clientName'] || ''} onChange={e => setColumnFilters(p => ({...p, clientName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar linha temporal..." value={columnFilters['timeline'] || ''} onChange={e => setColumnFilters(p => ({...p, timeline: e.target.value}))} className="h-8"/></TableHead>
                <TableHead colSpan={4}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Limpar Filtros</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredProjects.map(project => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium"><Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link></TableCell>
                  <TableCell>{project.clientName}</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge></TableCell>
                  <TableCell>{project.timeline}</TableCell>
                  <TableCell><Progress value={project.progress} className="h-2"/></TableCell>
                  <TableCell className="text-center">{project.documentCount} / {project.totalExpected}</TableCell>
                  <TableCell className="text-center">{project.finalizedBooksCount}</TableCell>
                  <TableCell className="text-center">{project.errorBooksCount > 0 ? <span className="text-destructive font-bold">{project.errorBooksCount}</span> : '0'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={dialogState.open} onOpenChange={(open) => { if (!open) setDialogFilter(''); setDialogState(prev => ({ ...prev, open })); }}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{dialogState.title}</DialogTitle>
                    <DialogDescription>A mostrar {filteredDialogItems.length} de {dialogState.items.length} projetos.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Input
                        placeholder="Filtrar projetos..."
                        value={dialogFilter}
                        onChange={(e) => setDialogFilter(e.target.value)}
                    />
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     <Table>
                        <TableHeader><TableRow><TableHead>Projeto</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredDialogItems.map(project => (
                                <TableRow key={project.id}>
                                    <TableCell><Link href={`/projects/${project.id}`} className="hover:underline font-medium">{project.name}</Link></TableCell>
                                    <TableCell>{project.clientName}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}

    