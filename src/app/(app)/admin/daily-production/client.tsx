
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
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
import { format, subDays, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import type { DateRange } from "react-day-picker"
import { TrendingUp, Award, Calendar, UserCheck, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
  const { books, users } = useAppContext();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [taskTypeFilter, setTaskTypeFilter] = React.useState<string>("all");
  const [userFilter, setUserFilter] = React.useState<string>("all");
  const [sorting, setSorting] = React.useState<{ id: string, desc: boolean }[]>([{ id: 'completedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);

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
  }, [allCompletedTasks, dateRange, taskTypeFilter, userFilter, columnFilters, sorting]);

  const stats = React.useMemo(() => {
    if (filteredTasks.length === 0) return { totalTasks: 0, dailyAvg: 0, bestDay: { date: 'N/A', count: 0 }, topOperator: { name: 'N/A', count: 0 } };

    const tasksByDay: Record<string, number> = {};
    filteredTasks.forEach(task => {
      const day = format(task.completedAt, 'yyyy-MM-dd');
      tasksByDay[day] = (tasksByDay[day] || 0) + 1;
    });

    const numDays = Object.keys(tasksByDay).length || 1;
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
  }, [filteredTasks]);

  const chartData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { byDay: [], byUser: [], byType: [] };

    const tasksByDay = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
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
      
       <Card>
            <CardHeader><CardTitle>Tabela de Produção Detalhada</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('completedAt')}>Data {getSortIndicator('completedAt')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('userName')}>Utilizador {getSortIndicator('userName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('taskType')}>Tarefa {getSortIndicator('taskType')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('bookName')}>Livro {getSortIndicator('bookName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('projectName')}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('pageCount')}>Páginas {getSortIndicator('pageCount')}</div></TableHead>
                        </TableRow>
                         <TableRow>
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
                            <TableRow key={task.id}>
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
            <CardFooter className="justify-end">
                {/* Pagination component would go here */}
            </CardFooter>
       </Card>
    </div>
  )
}
