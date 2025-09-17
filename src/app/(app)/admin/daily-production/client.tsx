
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
import { TrendingUp, Award, Calendar, UserCheck, ChevronsUpDown, ArrowUp, ArrowDown, Download } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"

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
  const [sorting, setSorting] = React.useState<{ id: string, desc: boolean }[]>([{ id: 'completedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selection, setSelection] = React.useState<string[]>([]);

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

  const filteredTasks = React.useMemo(() => {
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

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        tasks = tasks.filter(task =>
          String(task[columnId as keyof CompletedTask]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    if (sorting.length > 0) {
      tasks.sort((a, b) => {
        const s = sorting[0];
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
  }, [allCompletedTasks, dateRange, taskTypeFilter, userFilter, projectFilter, columnFilters, sorting]);

  const selectedTasks = React.useMemo(() => {
    return filteredTasks.filter(task => selection.includes(task.id));
  }, [filteredTasks, selection]);
  
  React.useEffect(() => {
    setSelection([]);
  }, [dateRange, taskTypeFilter, userFilter, projectFilter, columnFilters, sorting]);


  const stats = React.useMemo(() => {
    if (filteredTasks.length === 0) return { totalTasks: 0, dailyAvg: 0, bestDay: { date: 'N/A', count: 0 }, topOperator: { name: 'N/A', count: 0 } };

    const tasksByDay: Record<string, number> = {};
    filteredTasks.forEach(task => {
      const day = format(task.completedAt, 'yyyy-MM-dd');
      tasksByDay[day] = (tasksByDay[day] || 0) + 1;
    });

    const numDays = dateRange?.from && dateRange.to 
        ? Math.abs(new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 3600 * 24) + 1 
        : 1;
    const bestDayEntry = Object.entries(tasksByDay).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

    const tasksByUser = filteredTasks.reduce((acc, task) => {
      acc[task.userName] = (acc[task.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topOperatorEntry = Object.entries(tasksByUser).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
    
    return {
      totalTasks: filteredTasks.length,
      dailyAvg: (filteredTasks.length / numDays).toFixed(1),
      bestDay: { date: bestDayEntry[0], count: bestDayEntry[1] },
      topOperator: { name: topOperatorEntry[0], count: topOperatorEntry[1] }
    };
  }, [filteredTasks, dateRange]);

  const chartData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { byDay: [], byUser: [], byType: [] };

    const tasksByDay = Array.from({ length: Math.abs(new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 3600 * 24) + 1 }, (_, i) => {
        const day = new Date(dateRange.from!);
        day.setDate(day.getDate() + i);
        return day;
    }).map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = filteredTasks.filter(t => format(t.completedAt, 'yyyy-MM-dd') === dayStr).length;
        return { date: format(day, 'MMM d'), count };
    });

    const byUser = Object.entries(
      filteredTasks.reduce((acc, task) => {
        acc[task.userName] = (acc[task.userName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10);
    
    const byType = Object.entries(
      filteredTasks.reduce((acc, task) => {
        acc[task.taskType] = (acc[task.taskType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, fill: `hsl(${Math.random() * 360}, 70%, 50%)` }));

    return { byDay: tasksByDay, byUser, byType };
  }, [filteredTasks, dateRange]);
  
  const chartConfig = { count: { label: "Tasks" } } satisfies ChartConfig;

  const handleSort = (columnId: string) => {
    setSorting(current => {
      if (current[0]?.id === columnId) return [{ id: columnId, desc: !current[0].desc }];
      return [{ id: columnId, desc: false }];
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
  };

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);

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
        downloadFile(JSON.stringify(dataToExport, null, 2), 'daily_production.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(dataToExport[0] || {});
        const csvContent = [headers.join(','), ...dataToExport.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'daily_production.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
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
          content = JSON.stringify(dataToExport, null, 2);
      } else {
          const headers = Object.keys(dataToExport[0] || {});
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
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          <PaginationItem><PaginationLink href="#">Page {currentPage} of {totalPages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
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
                    <CardTitle>Tabela de Produção Detalhada</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar</Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Exportar Selecionados ({selection.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportData('xlsx', selectedTasks)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('json', selectedTasks)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('csv', selectedTasks)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Copiar Selecionados ({selection.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => copyToClipboard('json', selectedTasks)} disabled={selection.length === 0}>Copiar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => copyToClipboard('csv', selectedTasks)} disabled={selection.length === 0}>Copiar como CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Exportar Todos ({filteredTasks.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportData('xlsx', filteredTasks)} disabled={filteredTasks.length === 0}>Exportar como XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('json', filteredTasks)} disabled={filteredTasks.length === 0}>Exportar como JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('csv', filteredTasks)} disabled={filteredTasks.length === 0}>Exportar como CSV</DropdownMenuItem>
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
                                    checked={paginatedTasks.length > 0 && selection.length === paginatedTasks.length}
                                    onCheckedChange={(checked) => setSelection(checked ? paginatedTasks.map(t => t.id) : [])}
                                />
                            </TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('completedAt')}>Data {getSortIndicator('completedAt')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('userName')}>Utilizador {getSortIndicator('userName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('taskType')}>Tarefa {getSortIndicator('taskType')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('bookName')}>Livro {getSortIndicator('bookName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('projectName')}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('pageCount')}>Páginas {getSortIndicator('pageCount')}</div></TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead/>
                            <TableHead><Input placeholder="Filtrar data..." value={columnFilters['completedAt'] || ''} onChange={(e) => setColumnFilters(p => ({...p, completedAt: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar utilizador..." value={columnFilters['userName'] || ''} onChange={(e) => setColumnFilters(p => ({...p, userName: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar tarefa..." value={columnFilters['taskType'] || ''} onChange={(e) => setColumnFilters(p => ({...p, taskType: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar livro..." value={columnFilters['bookName'] || ''} onChange={(e) => setColumnFilters(p => ({...p, bookName: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead><Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={(e) => setColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                            <TableHead/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTasks.map(task => (
                            <TableRow key={task.id} data-state={selection.includes(task.id) && "selected"}>
                                <TableCell>
                                    <Checkbox
                                      checked={selection.includes(task.id)}
                                      onCheckedChange={(checked) => setSelection(prev => checked ? [...prev, task.id] : prev.filter(id => id !== task.id))}
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
                    {selection.length > 0 ? `${selection.length} de ${filteredTasks.length} tarefa(s) selecionada(s).` : `A mostrar ${paginatedTasks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedTasks.length} de ${filteredTasks.length} tarefas`}
                </div>
                <PaginationNav />
            </CardFooter>
       </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Produção Diária (Nº de Tarefas)</CardTitle></CardHeader>
            <CardContent><ChartContainer config={chartConfig} className="h-[250px] w-full"><BarChart data={chartData.byDay}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis /><Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={4} /></BarChart></ChartContainer></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Produção por Tipo</CardTitle></CardHeader>
            <CardContent><ChartContainer config={chartConfig} className="h-[250px] w-full"><PieChart><Tooltip content={<ChartTooltipContent hideLabel />} /><Pie data={chartData.byType} dataKey="value" nameKey="name" innerRadius={50} label>{chartData.byType.map(e => <Cell key={e.name} fill={e.fill} />)}</Pie><Legend /></PieChart></ChartContainer></CardContent>
        </Card>
      </div>
    </div>
  )
}
