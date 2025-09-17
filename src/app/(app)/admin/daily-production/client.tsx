
"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { useAppContext } from "@/context/workflow-context"
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { TrendingUp, Award, Calendar, UserCheck, ChevronsUpDown, ArrowUp, ArrowDown, Download, Group } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import { Label } from "@/components/ui/label";

type CompletedTask = {
  id: string;
  bookId: string;
  bookName: string;
  projectId: string;
  projectName: string;
  pageCount: number;
  taskType: 'Digitalização' | 'Indexação' | 'Controlo de Qualidade';
  completedAt: Date;
  userId: string;
  userName: string;
};

type GroupingOption = 'user' | 'project' | 'date' | 'task';

type SummaryData = {
    name: string;
    taskCount: number;
    pageCount: number;
}

const ITEMS_PER_PAGE = 20;

export default function DailyProductionClient() {
  const { books, users, allProjects } = useAppContext();
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [taskTypeFilter, setTaskTypeFilter] = React.useState<string>("all");
  const [userFilter, setUserFilter] = React.useState<string>("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  
  // States for Detailed Table
  const [detailedSorting, setDetailedSorting] = React.useState<{ id: string, desc: boolean }[]>([{ id: 'completedAt', desc: true }]);
  const [detailedColumnFilters, setDetailedColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [detailedCurrentPage, setDetailedCurrentPage] = React.useState(1);
  const [detailedSelection, setDetailedSelection] = React.useState<string[]>([]);
  
  // States for Summary Table
  const [groupBy, setGroupBy] = React.useState<GroupingOption>('user');
  const [summaryColumnFilters, setSummaryColumnFilters] = React.useState<{ [key: string]: string }>({});

  const allCompletedTasks = React.useMemo((): CompletedTask[] => {
    const tasks: CompletedTask[] = [];
    books.forEach(book => {
      if (book.scanEndTime && book.scannerUserId) {
        tasks.push({
          id: `${book.id}-scan`,
          bookId: book.id, bookName: book.name, projectId: book.projectId, projectName: book.projectName,
          pageCount: book.expectedDocuments, taskType: 'Digitalização',
          completedAt: new Date(book.scanEndTime), userId: book.scannerUserId,
          userName: users.find(u => u.id === book.scannerUserId)?.name || 'Unknown',
        });
      }
      if (book.indexingEndTime && book.indexerUserId) {
        tasks.push({
          id: `${book.id}-index`,
          bookId: book.id, bookName: book.name, projectId: book.projectId, projectName: book.projectName,
          pageCount: book.expectedDocuments, taskType: 'Indexação',
          completedAt: new Date(book.indexingEndTime), userId: book.indexerUserId,
          userName: users.find(u => u.id === book.indexerUserId)?.name || 'Unknown',
        });
      }
      if (book.qcEndTime && book.qcUserId) {
        tasks.push({
          id: `${book.id}-qc`,
          bookId: book.id, bookName: book.name, projectId: book.projectId, projectName: book.projectName,
          pageCount: book.expectedDocuments, taskType: 'Controlo de Qualidade',
          completedAt: new Date(book.qcEndTime), userId: book.qcUserId,
          userName: users.find(u => u.id === book.qcUserId)?.name || 'Unknown',
        });
      }
    });
    return tasks;
  }, [books, users]);

  const globallyFilteredTasks = React.useMemo(() => {
    let tasks = allCompletedTasks;
    if (dateRange?.from && dateRange?.to) {
      const from = startOfDay(dateRange.from);
      const to = endOfDay(dateRange.to);
      tasks = tasks.filter(task => isWithinInterval(task.completedAt, { start: from, end: to }));
    }
    if (taskTypeFilter !== 'all') {
      tasks = tasks.filter(task => task.taskType === taskTypeFilter);
    }
    if (userFilter !== 'all') {
      tasks = tasks.filter(task => task.userId === userFilter);
    }
    if (projectFilter !== 'all') {
        tasks = tasks.filter(task => task.projectId === projectFilter);
    }
    return tasks;
  }, [allCompletedTasks, dateRange, taskTypeFilter, userFilter, projectFilter]);

  const summaryData = React.useMemo((): SummaryData[] => {
    const keyMap = {
        user: 'userName',
        project: 'projectName',
        date: 'completedAt',
        task: 'taskType'
    };
    const groupKey = keyMap[groupBy];

    const grouped = globallyFilteredTasks.reduce((acc, task) => {
        let key = task[groupKey as keyof CompletedTask];
        if(groupKey === 'completedAt') {
            key = format(new Date(key as Date), 'yyyy-MM-dd');
        }
        const groupName = String(key);
        if (!acc[groupName]) {
            acc[groupName] = { name: groupName, taskCount: 0, pageCount: 0 };
        }
        acc[groupName].taskCount += 1;
        acc[groupName].pageCount += task.pageCount || 0;
        return acc;
    }, {} as Record<string, SummaryData>);
    
    let result = Object.values(grouped);
    
    if (summaryColumnFilters.name) {
        result = result.filter(item => item.name.toLowerCase().includes(summaryColumnFilters.name.toLowerCase()));
    }

    return result.sort((a,b) => b.taskCount - a.taskCount);
  }, [globallyFilteredTasks, groupBy, summaryColumnFilters]);

  const tasksForDetailedView = React.useMemo(() => {
    let tasks = globallyFilteredTasks;
    
    const summaryFilterNames = new Set(summaryData.map(d => d.name));
    
    const keyMap = {
        user: 'userName',
        project: 'projectName',
        date: 'completedAt',
        task: 'taskType'
    };
    const groupKey = keyMap[groupBy];

    tasks = tasks.filter(task => {
        let key = task[groupKey as keyof CompletedTask];
        if (groupKey === 'completedAt') {
            key = format(new Date(key as Date), 'yyyy-MM-dd');
        }
        return summaryFilterNames.has(String(key));
    });

    Object.entries(detailedColumnFilters).forEach(([columnId, value]) => {
      if (value) {
        tasks = tasks.filter(task =>
          String(task[columnId as keyof CompletedTask]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    if (detailedSorting.length > 0) {
      tasks.sort((a, b) => {
        const s = detailedSorting[0];
        const valA = a[s.id as keyof CompletedTask];
        const valB = b[s.id as keyof CompletedTask];
        let result: number;
        if (valA instanceof Date && valB instanceof Date) {
          result = valA.getTime() - valB.getTime();
        } else {
          result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        }
        return s.desc ? -result : result;
      });
    }
    return tasks;
  }, [globallyFilteredTasks, detailedColumnFilters, detailedSorting, summaryData, groupBy]);
  
  const selectedTasks = React.useMemo(() => {
    return tasksForDetailedView.filter(task => detailedSelection.includes(task.id));
  }, [tasksForDetailedView, detailedSelection]);
  
  React.useEffect(() => {
    setDetailedSelection([]);
  }, [dateRange, taskTypeFilter, userFilter, projectFilter, detailedColumnFilters, detailedSorting, summaryColumnFilters]);


  const stats = React.useMemo(() => {
    if (globallyFilteredTasks.length === 0) return { totalTasks: 0, dailyAvg: 0, bestDay: { date: 'N/A', count: 0 }, topOperator: { name: 'N/A', count: 0 } };

    const tasksByDay: Record<string, number> = {};
    globallyFilteredTasks.forEach(task => {
      const day = format(task.completedAt, 'yyyy-MM-dd');
      tasksByDay[day] = (tasksByDay[day] || 0) + 1;
    });

    const numDays = dateRange?.from && dateRange.to 
        ? Math.abs(new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 3600 * 24) + 1 
        : 1;
    const bestDayEntry = Object.entries(tasksByDay).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

    const tasksByUser = globallyFilteredTasks.reduce((acc, task) => {
      acc[task.userName] = (acc[task.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topOperatorEntry = Object.entries(tasksByUser).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
    
    return {
      totalTasks: globallyFilteredTasks.length,
      dailyAvg: (globallyFilteredTasks.length / numDays).toFixed(1),
      bestDay: { date: bestDayEntry[0], count: bestDayEntry[1] },
      topOperator: { name: topOperatorEntry[0], count: topOperatorEntry[1] }
    };
  }, [globallyFilteredTasks, dateRange]);

  const chartData = React.useMemo(() => {
    if (!summaryData) return { byDay: [], byUser: [], byType: [] };
    const chartSource = summaryData.slice(0,10);
    return { 
        byDay: chartSource.map(d => ({ date: d.name, count: d.taskCount })), 
        byUser: chartSource, 
        byType: chartSource.map(d => ({ name: d.name, value: d.taskCount, fill: `hsl(${Math.random() * 360}, 70%, 50%)` }))
    };
  }, [summaryData]);
  
  const chartConfig = { count: { label: "Tasks" } } satisfies ChartConfig;

  const handleDetailedSort = (columnId: string) => {
    setDetailedSorting(current => {
      if (current[0]?.id === columnId) return [{ id: columnId, desc: !current[0].desc }];
      return [{ id: columnId, desc: false }];
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sort = detailedSorting.find(s => s.id === columnId);
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
  };

  const paginatedTasks = tasksForDetailedView.slice((detailedCurrentPage - 1) * ITEMS_PER_PAGE, detailedCurrentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(tasksForDetailedView.length / ITEMS_PER_PAGE);

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportData = (format: 'xlsx' | 'json' | 'csv', dataToExport: CompletedTask[]) => {
    if (dataToExport.length === 0) {
        toast({ title: "Sem Dados para Exportar", description: "Não há itens para exportar." }); 
        return;
    }
    if (format === 'json') {
        const jsonString = JSON.stringify(dataToExport.map(({ id, ...rest }) => rest), null, 2);
        downloadFile(jsonString, 'daily_production.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(dataToExport[0] || {}).filter(h => h !== 'id');
        const csvContent = [headers.join(','), ...dataToExport.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'daily_production.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const data = dataToExport.map(({ id, ...rest }) => rest);
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Production');
        XLSX.writeFile(workbook, 'daily_production.xlsx');
    }
    toast({ title: "Exportação Concluída", description: `${dataToExport.length} tarefas exportadas.` });
  };
  
  const copyToClipboard = (format: 'json' | 'csv', dataToExport: CompletedTask[]) => {
      if (dataToExport.length === 0) return;
      let content = '';
      if (format === 'json') {
          content = JSON.stringify(dataToExport.map(({ id, ...rest }) => rest), null, 2);
      } else {
          const headers = Object.keys(dataToExport[0] || {}).filter(h => h !== 'id');
          content = [headers.join(','), ...dataToExport.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
      }
      navigator.clipboard.writeText(content).then(() => {
          toast({ title: "Copiado para a Área de Transferência", description: `${dataToExport.length} tarefas copiadas.` });
      }, () => {
          toast({ title: "Falha ao Copiar", variant: "destructive" });
      });
  };
  
  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setDetailedCurrentPage(p => Math.max(1, p - 1)); }} className={detailedCurrentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          <PaginationItem><PaginationLink href="#">Page {detailedCurrentPage} of {totalPages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setDetailedCurrentPage(p => Math.min(totalPages, p + 1)); }} className={detailedCurrentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  const getSummaryHeader = () => {
    switch (groupBy) {
        case 'user': return 'Utilizador';
        case 'project': return 'Projeto';
        case 'date': return 'Data';
        case 'task': return 'Tipo de Tarefa';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Produção Diária</h1>
          <p className="text-muted-foreground">Análise da produtividade dos operadores por tarefa concluída.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
           <div className="flex flex-wrap items-center gap-4 pt-2">
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by project..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {allProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by task..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tarefas</SelectItem>
                <SelectItem value="Digitalização">Digitalização</SelectItem>
                <SelectItem value="Indexação">Indexação</SelectItem>
                <SelectItem value="Controlo de Qualidade">Controlo de Qualidade</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by user..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Utilizadores</SelectItem>
                {users.filter(u => u.role !== 'System' && u.role !== 'Client').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalTasks}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Média Diária</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.dailyAvg}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Melhor Dia</CardTitle><Award className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.bestDay.count}</div><p className="text-xs text-muted-foreground">on {stats.bestDay.date}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Top Operador</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.topOperator.name}</div><p className="text-xs text-muted-foreground">{stats.topOperator.count} tarefas</p></CardContent></Card>
      </div>

       <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Resumo da Produção</CardTitle>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="group-by" className="flex items-center gap-2 text-sm font-medium">
                            <Group className="h-4 w-4" />
                            Agrupar por
                        </Label>
                        <Select value={groupBy} onValueChange={value => setGroupBy(value as GroupingOption)}>
                            <SelectTrigger id="group-by" className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Utilizador</SelectItem>
                                <SelectItem value="project">Projeto</SelectItem>
                                <SelectItem value="date">Data</SelectItem>
                                <SelectItem value="task">Tipo de Tarefa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{getSummaryHeader()}</TableHead>
                            <TableHead className="text-right">Tarefas Concluídas</TableHead>
                            <TableHead className="text-right">Total de Páginas</TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead><Input placeholder={`Filtrar por ${getSummaryHeader().toLowerCase()}...`} value={summaryColumnFilters.name || ''} onChange={(e) => setSummaryColumnFilters({ name: e.target.value })} className="h-8"/></TableHead>
                            <TableHead/>
                            <TableHead/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summaryData.length > 0 ? summaryData.map(row => (
                            <TableRow key={row.name}>
                                <TableCell className="font-medium">{row.name}</TableCell>
                                <TableCell className="text-right">{row.taskCount}</TableCell>
                                <TableCell className="text-right">{row.pageCount.toLocaleString()}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} className="text-center h-24">Sem dados de produção para o período selecionado.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
       </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Produção Diária (Nº de Tarefas)</CardTitle></CardHeader>
            <CardContent><ChartContainer config={chartConfig} className="h-[250px] w-full"><BarChart data={chartData.byDay}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis allowDecimals={false} /><Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={4} /></BarChart></ChartContainer></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Produção por Tipo</CardTitle></CardHeader>
            <CardContent><ChartContainer config={chartConfig} className="h-[250px] w-full"><PieChart><Tooltip content={<ChartTooltipContent hideLabel />} /><Pie data={chartData.byType} dataKey="value" nameKey="name" innerRadius={50} label>{chartData.byType.map(e => <Cell key={e.name} fill={e.fill} />)}</Pie><Legend /></PieChart></ChartContainer></CardContent>
        </Card>
      </div>

      <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Tabela de Produção Detalhada</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar</Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Exportar Selecionados ({detailedSelection.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportData('xlsx', selectedTasks)} disabled={detailedSelection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('json', selectedTasks)} disabled={detailedSelection.length === 0}>Exportar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('csv', selectedTasks)} disabled={detailedSelection.length === 0}>Exportar como CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Copiar Selecionados ({detailedSelection.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => copyToClipboard('json', selectedTasks)} disabled={detailedSelection.length === 0}>Copiar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => copyToClipboard('csv', selectedTasks)} disabled={detailedSelection.length === 0}>Copiar como CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Exportar Todos ({tasksForDetailedView.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportData('xlsx', tasksForDetailedView)} disabled={tasksForDetailedView.length === 0}>Exportar como XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('json', tasksForDetailedView)} disabled={tasksForDetailedView.length === 0}>Exportar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('csv', tasksForDetailedView)} disabled={tasksForDetailedView.length === 0}>Exportar como CSV</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={paginatedTasks.length > 0 && detailedSelection.length === paginatedTasks.length}
                                    onCheckedChange={(checked) => setDetailedSelection(checked ? paginatedTasks.map(t => t.id) : [])}
                                />
                            </TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleDetailedSort('completedAt')}>Data {getSortIndicator('completedAt')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleDetailedSort('userName')}>Utilizador {getSortIndicator('userName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleDetailedSort('taskType')}>Tarefa {getSortIndicator('taskType')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleDetailedSort('bookName')}>Livro {getSortIndicator('bookName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleDetailedSort('projectName')}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleDetailedSort('pageCount')}>Páginas {getSortIndicator('pageCount')}</div></TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead/>
                            <TableHead><Input placeholder="Filtrar data..." value={detailedColumnFilters['completedAt'] || ''} onChange={(e) => setDetailedColumnFilters(p => ({...p, completedAt: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar utilizador..." value={detailedColumnFilters['userName'] || ''} onChange={(e) => setDetailedColumnFilters(p => ({...p, userName: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar tarefa..." value={detailedColumnFilters['taskType'] || ''} onChange={(e) => setDetailedColumnFilters(p => ({...p, taskType: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar livro..." value={detailedColumnFilters['bookName'] || ''} onChange={(e) => setDetailedColumnFilters(p => ({...p, bookName: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar projeto..." value={detailedColumnFilters['projectName'] || ''} onChange={(e) => setDetailedColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTasks.map(task => (
                            <TableRow key={task.id} data-state={detailedSelection.includes(task.id) && "selected"}>
                                <TableCell>
                                    <Checkbox
                                      checked={detailedSelection.includes(task.id)}
                                      onCheckedChange={(checked) => setDetailedSelection(prev => checked ? [...prev, task.id] : prev.filter(id => id !== task.id))}
                                    />
                                </TableCell>
                                <TableCell>{format(task.completedAt, 'yyyy-MM-dd HH:mm')}</TableCell>
                                <TableCell>{task.userName}</TableCell>
                                <TableCell><Badge variant="secondary">{task.taskType}</Badge></TableCell>
                                <TableCell><Link href={`/books/${task.bookId}`} className="hover:underline">{task.bookName}</Link></TableCell>
                                <TableCell>{task.projectName}</TableCell>
                                <TableCell className="text-right">{task.pageCount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    {detailedSelection.length > 0 ? `${detailedSelection.length} de ${tasksForDetailedView.length} tarefa(s) selecionada(s).` : `A mostrar ${paginatedTasks.length > 0 ? (detailedCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(detailedCurrentPage - 1) * ITEMS_PER_PAGE + paginatedTasks.length} de ${tasksForDetailedView.length} tarefas`}
                </div>
                <PaginationNav />
            </CardFooter>
       </Card>
    </div>
  )
}
