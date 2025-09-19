
"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
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
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { TrendingUp, Award, Calendar, UserCheck, ChevronsUpDown, ArrowUp, ArrowDown, Download, Group, Book, FileText, Filter } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription } from "@/components/ui/dialog";
import type { EnrichedBook } from "@/lib/data";

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
    tasks: CompletedTask[];
}

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': case 'Finalized': case 'Archived': return 'default';
        case 'In Processing': case 'Scanning Started': case 'Indexing Started': case 'Checking Started': return 'secondary';
        case 'Client Rejected': return 'destructive';
        default: return 'outline';
    }
}

export default function DailyProductionClient() {
  const { allProjects, users } = useAppContext();
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
  const [detailedItemsPerPage, setDetailedItemsPerPage] = React.useState(20);
  const [detailedSelection, setDetailedSelection] = React.useState<string[]>([]);
  
  // States for Summary Table
  const [groupBy, setGroupBy] = React.useState<GroupingOption[]>(['user']);
  const [summarySorting, setSummarySorting] = React.useState<{ id: string, desc: boolean }[]>([{ id: 'pageCount', desc: true }]);
  const [summaryCurrentPage, setSummaryCurrentPage] = React.useState(1);
  const [summaryItemsPerPage, setSummaryItemsPerPage] = React.useState(10);
  const [summaryColumnFilters, setSummaryColumnFilters] = React.useState<{ [key: string]: string }>({});
  
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: CompletedTask[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');

  const allCompletedTasks = React.useMemo((): CompletedTask[] => {
    const tasks: CompletedTask[] = [];
    allProjects.flatMap(p => p.books).forEach(book => {
      if (book.scanEndTime && book.scannerUserId) {
        tasks.push({
          id: `${book.id}-scan`, bookId: book.id, bookName: book.name, projectId: book.projectId, projectName: book.projectName,
          pageCount: book.expectedDocuments, taskType: 'Digitalização',
          completedAt: new Date(book.scanEndTime), userId: book.scannerUserId,
          userName: users.find(u => u.id === book.scannerUserId)?.name || 'Unknown',
        });
      }
      if (book.indexingEndTime && book.indexerUserId) {
        tasks.push({
          id: `${book.id}-index`, bookId: book.id, bookName: book.name, projectId: book.projectId, projectName: book.projectName,
          pageCount: book.expectedDocuments, taskType: 'Indexação',
          completedAt: new Date(book.indexingEndTime), userId: book.indexerUserId,
          userName: users.find(u => u.id === book.indexerUserId)?.name || 'Unknown',
        });
      }
      if (book.qcEndTime && book.qcUserId) {
        tasks.push({
          id: `${book.id}-qc`, bookId: book.id, bookName: book.name, projectId: book.projectId, projectName: book.projectName,
          pageCount: book.expectedDocuments, taskType: 'Controlo de Qualidade',
          completedAt: new Date(book.qcEndTime), userId: book.qcUserId,
          userName: users.find(u => u.id === book.qcUserId)?.name || 'Unknown',
        });
      }
    });
    return tasks;
  }, [allProjects, users]);

  const globallyFilteredTasks = React.useMemo(() => {
    let tasks = allCompletedTasks;
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = endOfDay(dateRange.to || dateRange.from);
      tasks = tasks.filter(task => isWithinInterval(task.completedAt, { start: from, end: to }));
    }
    if (taskTypeFilter !== 'all') tasks = tasks.filter(task => task.taskType === taskTypeFilter);
    if (userFilter !== 'all') tasks = tasks.filter(task => task.userId === userFilter);
    if (projectFilter !== 'all') tasks = tasks.filter(task => task.projectId === projectFilter);
    return tasks;
  }, [allCompletedTasks, dateRange, taskTypeFilter, userFilter, projectFilter]);

  const summaryData = React.useMemo((): SummaryData[] => {
    if (groupBy.length === 0) return [];
    const keyMap = { user: 'userName', project: 'projectName', date: 'completedAt', task: 'taskType' };

    const grouped = globallyFilteredTasks.reduce((acc, task) => {
        const compositeKey = groupBy.map(groupKey => {
            const taskKey = keyMap[groupKey];
            let value = task[taskKey as keyof CompletedTask];
            if (taskKey === 'completedAt' && value instanceof Date) return format(new Date(value as Date), 'yyyy-MM-dd');
            return String(value);
        }).join(' - ');

        if (!acc[compositeKey]) acc[compositeKey] = { name: compositeKey, taskCount: 0, pageCount: 0, tasks: [] };
        acc[compositeKey].taskCount += 1;
        acc[compositeKey].pageCount += task.pageCount || 0;
        acc[compositeKey].tasks.push(task);
        return acc;
    }, {} as Record<string, SummaryData>);
    
    let result = Object.values(grouped);
    
    if (summaryColumnFilters.name) result = result.filter(item => item.name.toLowerCase().includes(summaryColumnFilters.name.toLowerCase()));
    
    if (summarySorting.length > 0) {
        const s = summarySorting[0];
        result.sort((a, b) => {
            const valA = a[s.id as keyof SummaryData];
            const valB = b[s.id as keyof SummaryData];
            const result = typeof valA === 'number' && typeof valB === 'number' 
              ? valA - valB 
              : String(valA).localeCompare(String(valB));
            return s.desc ? -result : result;
        });
    }

    return result;
  }, [globallyFilteredTasks, groupBy, summaryColumnFilters, summarySorting]);
  
  const paginatedSummaryData = summaryData.slice((summaryCurrentPage - 1) * summaryItemsPerPage, summaryCurrentPage * summaryItemsPerPage);

  const tasksForDetailedView = React.useMemo(() => {
    let tasks = globallyFilteredTasks;
    const summaryFilterNames = new Set(summaryData.map(d => d.name));
    const keyMap = { user: 'userName', project: 'projectName', date: 'completedAt', task: 'taskType' };
    
    if(groupBy.length > 0) {
      tasks = tasks.filter(task => {
          const compositeKey = groupBy.map(groupKey => {
              const taskKey = keyMap[groupKey];
              let value = task[taskKey as keyof CompletedTask];
              if (taskKey === 'completedAt' && value instanceof Date) return format(new Date(value as Date), 'yyyy-MM-dd');
              return String(value);
          }).join(' - ');
          return summaryFilterNames.has(compositeKey);
      });
    }

    Object.entries(detailedColumnFilters).forEach(([columnId, value]) => {
      if (value) tasks = tasks.filter(task => String(task[columnId as keyof CompletedTask]).toLowerCase().includes(value.toLowerCase()));
    });

    if (detailedSorting.length > 0) {
      tasks.sort((a, b) => {
        const s = detailedSorting[0];
        const valA = a[s.id as keyof CompletedTask];
        const valB = b[s.id as keyof CompletedTask];
        let result: number;
        if (valA instanceof Date && valB instanceof Date) result = valA.getTime() - valB.getTime();
        else result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return s.desc ? -result : result;
      });
    }
    return tasks;
  }, [globallyFilteredTasks, detailedColumnFilters, detailedSorting, summaryData, groupBy]);
  
  const paginatedDetailedTasks = tasksForDetailedView.slice((detailedCurrentPage - 1) * detailedItemsPerPage, detailedCurrentPage * detailedItemsPerPage);
  
  const selectedTasks = React.useMemo(() => tasksForDetailedView.filter(task => detailedSelection.includes(task.id)), [tasksForDetailedView, detailedSelection]);
  
  React.useEffect(() => {
    setDetailedSelection([]);
  }, [dateRange, taskTypeFilter, userFilter, projectFilter, detailedColumnFilters, detailedSorting, summaryColumnFilters]);

  const stats = React.useMemo(() => {
    if (globallyFilteredTasks.length === 0) return { totalTasks: 0, totalPages: 0, dailyAvgTasks: 0, dailyAvgPages: 0, bestDayTasks: { date: 'N/A', count: 0, items: [] }, bestDayPages: { date: 'N/A', count: 0, items: [] }, topOperator: { name: 'N/A', taskCount: 0, pageCount: 0, items: [] } };

    const tasksByDay = globallyFilteredTasks.reduce((acc, task) => {
      const day = format(task.completedAt, 'yyyy-MM-dd');
      if (!acc[day]) acc[day] = { taskCount: 0, pageCount: 0, items: [] };
      acc[day].taskCount += 1;
      acc[day].pageCount += task.pageCount || 0;
      acc[day].items.push(task);
      return acc;
    }, {} as Record<string, {taskCount: number, pageCount: number, items: CompletedTask[]}>);
    
    const numDays = (dateRange?.from && dateRange.to) ? Math.abs(new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 3600 * 24) + 1 : 1;
    const totalPages = globallyFilteredTasks.reduce((sum, task) => sum + (task.pageCount || 0), 0);

    const bestDayTasksEntry = Object.entries(tasksByDay).sort((a, b) => b[1].taskCount - a[1].taskCount)[0] || ['N/A', {taskCount: 0, items: []}];
    const bestDayPagesEntry = Object.entries(tasksByDay).sort((a, b) => b[1].pageCount - a[1].pageCount)[0] || ['N/A', {pageCount: 0, items: []}];

    const tasksByUser = globallyFilteredTasks.reduce((acc, task) => {
      if (!acc[task.userName]) acc[task.userName] = { taskCount: 0, pageCount: 0, items: [] };
      acc[task.userName].taskCount += 1;
      acc[task.userName].pageCount += task.pageCount || 0;
      acc[task.userName].items.push(task);
      return acc;
    }, {} as Record<string, { taskCount: number, pageCount: number, items: CompletedTask[] }>);

    const topOperatorEntry = Object.entries(tasksByUser).sort((a, b) => b[1].pageCount - a[1].pageCount)[0] || ['N/A', { taskCount: 0, pageCount: 0, items: [] }];
    
    return {
      totalTasks: globallyFilteredTasks.length, totalPages,
      dailyAvgTasks: (globallyFilteredTasks.length / numDays).toFixed(1), dailyAvgPages: (totalPages / numDays).toFixed(1),
      bestDayTasks: { date: bestDayTasksEntry[0], count: bestDayTasksEntry[1].taskCount, items: bestDayTasksEntry[1].items },
      bestDayPages: { date: bestDayPagesEntry[0], count: bestDayPagesEntry[1].pageCount, items: bestDayPagesEntry[1].items },
      topOperator: { name: topOperatorEntry[0], taskCount: topOperatorEntry[1].taskCount, pageCount: topOperatorEntry[1].pageCount, items: topOperatorEntry[1].items }
    };
  }, [globallyFilteredTasks, dateRange]);

  const chartData = React.useMemo(() => {
    if (!summaryData) return { byDay: [], byUser: [], byType: [] };
    const chartSource = summaryData.slice(0,10);
    return { 
        byDay: chartSource.map(d => ({ date: d.name, count: d.pageCount, items: d.tasks })), 
        byUser: chartSource, 
        byType: chartSource.map(d => ({ name: d.name, value: d.pageCount, fill: `hsl(${Math.random() * 360}, 70%, 50%)`, items: d.tasks }))
    };
  }, [summaryData]);
  
  const chartConfig = { count: { label: "Pages" }, value: { label: "Pages" } } satisfies ChartConfig;

  const handleSort = (columnId: string, setSorting: React.Dispatch<React.SetStateAction<{ id: string; desc: boolean; }[]>>) => {
    setSorting(current => {
      if (current[0]?.id === columnId) return [{ id: columnId, desc: !current[0].desc }];
      return [{ id: columnId, desc: false }];
    });
  };

  const getSortIndicator = (columnId: string, sorting: { id: string; desc: boolean; }[]) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
  };
  
  const handleKpiClick = (title: string, items: CompletedTask[]) => {
    if (!items || items.length === 0) return;
    setDialogState({ open: true, title, items });
    setDialogFilter('');
  }
  
  const handleChartClick = (data: any) => {
    if (!data || !data.activePayload?.length) return;
    const clickedData = data.activePayload[0].payload;
    if (clickedData.items) {
      handleKpiClick(`Details for ${clickedData.date || clickedData.name}`, clickedData.items);
    }
  }

  const exportData = (dataToExport: any[], fileName: string) => {
    if (dataToExport.length === 0) {
        toast({ title: "Sem Dados para Exportar", description: "Não há itens para exportar." }); 
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Production Data');
    XLSX.writeFile(workbook, fileName);
    toast({ title: "Exportação Concluída", description: `${dataToExport.length} registos exportados.` });
  };
  
  const PaginationNav = ({ totalPages, currentPage, onPageChange }: { totalPages: number, currentPage: number, onPageChange: (page: number) => void}) => {
    if (totalPages <= 1) return null;
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); onPageChange(Math.max(1, currentPage - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          <PaginationItem><PaginationLink href="#">Page {currentPage} of {totalPages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); onPageChange(Math.min(totalPages, currentPage + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  const getSummaryHeader = () => {
    if(groupBy.length === 0) return 'Agrupamento';
    return groupBy.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(' / ');
  }

  const getChartTitle = () => {
    if (groupBy.length === 0) return 'Produção';
    return `Produção por ${groupBy.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(' e ')}`;
  }
  
  const groupingOptions: { id: GroupingOption; label: string }[] = [
    { id: 'user', label: 'Utilizador' }, { id: 'project', label: 'Projeto' },
    { id: 'date', label: 'Data' }, { id: 'task', label: 'Tipo de Tarefa' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Produção Diária</h1>
          <p className="text-muted-foreground">Análise da produtividade dos operadores por tarefa concluída.</p>
        </div>
      </div>
      
       <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-base px-6 font-semibold rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtros</div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 px-6 border-x border-b rounded-b-lg bg-card">
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
              <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar por projeto..." /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Projetos</SelectItem>{allProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
              <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}><SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar por tarefa..." /></SelectTrigger><SelectContent><SelectItem value="all">Todas as Tarefas</SelectItem><SelectItem value="Digitalização">Digitalização</SelectItem><SelectItem value="Indexação">Indexação</SelectItem><SelectItem value="Controlo de Qualidade">Controlo de Qualidade</SelectItem></SelectContent></Select>
              <Select value={userFilter} onValueChange={setUserFilter}><SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar por utilizador..." /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Utilizadores</SelectItem>{users.filter(u => u.role !== 'System' && u.role !== 'Client').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick("Todas as Tarefas", globallyFilteredTasks)}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Totais</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="flex items-baseline gap-2"><Book className="h-4 w-4 text-muted-foreground"/><span className="text-2xl font-bold">{stats.totalTasks}</span><span className="text-sm text-muted-foreground">tarefas</span></div><div className="flex items-baseline gap-2"><FileText className="h-4 w-4 text-muted-foreground"/><span className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</span><span className="text-sm text-muted-foreground">páginas</span></div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Média Diária</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="flex items-baseline gap-2"><Book className="h-4 w-4 text-muted-foreground"/><span className="text-2xl font-bold">{stats.dailyAvgTasks}</span><span className="text-sm text-muted-foreground">tarefas/dia</span></div><div className="flex items-baseline gap-2"><FileText className="h-4 w-4 text-muted-foreground"/><span className="text-2xl font-bold">{stats.dailyAvgPages}</span><span className="text-sm text-muted-foreground">páginas/dia</span></div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Melhor Dia</CardTitle><Award className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="cursor-pointer hover:underline" onClick={() => handleKpiClick(`Melhor dia por páginas (${stats.bestDayPages.date})`, stats.bestDayPages.items)}><div className="flex items-baseline gap-2"><FileText className="h-4 w-4 text-muted-foreground"/><span className="text-2xl font-bold">{stats.bestDayPages.count.toLocaleString()}</span><span className="text-sm text-muted-foreground">páginas</span></div><p className="text-xs text-muted-foreground ml-6">em {stats.bestDayPages.date}</p></div><div className="cursor-pointer hover:underline mt-2" onClick={() => handleKpiClick(`Melhor dia por tarefas (${stats.bestDayTasks.date})`, stats.bestDayTasks.items)}><div className="flex items-baseline gap-2"><Book className="h-4 w-4 text-muted-foreground"/><span className="text-2xl font-bold">{stats.bestDayTasks.count}</span><span className="text-sm text-muted-foreground">tarefas</span></div><p className="text-xs text-muted-foreground ml-6">em {stats.bestDayTasks.date}</p></div></CardContent></Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick(`Tarefas de ${stats.topOperator.name}`, stats.topOperator.items)}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Top Operador (por Páginas)</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.topOperator.name}</div><p className="text-xs text-muted-foreground">{stats.topOperator.pageCount.toLocaleString()} páginas em {stats.topOperator.taskCount} tarefas</p></CardContent></Card>
      </div>

       <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Resumo da Produção</CardTitle>
                    <div className="flex items-center gap-4">
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => exportData(summaryData.map(d=>({name: d.name, taskCount: d.taskCount, pageCount: d.pageCount})), 'summary_production.xlsx')}>Exportar como XLSX</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="group-by" className="flex items-center gap-2 text-sm font-medium"><Group className="h-4 w-4" />Agrupar por</Label>
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-[180px] justify-between"><span>{getSummaryHeader()}</span><ChevronsUpDown className="h-4 w-4 opacity-50" /></Button></DropdownMenuTrigger><DropdownMenuContent>{groupingOptions.map(opt => (<DropdownMenuCheckboxItem key={opt.id} checked={groupBy.includes(opt.id)} onCheckedChange={(checked) => setGroupBy(current => checked ? [...current, opt.id] : current.filter(g => g !== opt.id))}>{opt.label}</DropdownMenuCheckboxItem>))}</DropdownMenuContent></DropdownMenu>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('name', setSummarySorting)}>{getSummaryHeader()} {getSortIndicator('name', summarySorting)}</div></TableHead>
                            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('taskCount', setSummarySorting)}>Tarefas Concluídas {getSortIndicator('taskCount', summarySorting)}</div></TableHead>
                            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('pageCount', setSummarySorting)}>Total de Páginas {getSortIndicator('pageCount', summarySorting)}</div></TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead><Input placeholder={`Filtrar por ${getSummaryHeader().toLowerCase()}...`} value={summaryColumnFilters.name || ''} onChange={(e) => setSummaryColumnFilters({ name: e.target.value })} className="h-8"/></TableHead>
                            <TableHead colSpan={2}/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedSummaryData.length > 0 ? paginatedSummaryData.map(row => (
                            <TableRow key={row.name} className="cursor-pointer" onClick={() => handleKpiClick(`Detalhes para ${row.name}`, row.tasks)}>
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
            <CardFooter className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Showing {paginatedSummaryData.length} of {summaryData.length} groups.</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2 text-xs">
                  <p className="text-muted-foreground">Itens por página</p>
                  <Select value={`${summaryItemsPerPage}`} onValueChange={(value) => { setSummaryItemsPerPage(Number(value)); setSummaryCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-[70px]"><SelectValue placeholder={summaryItemsPerPage} /></SelectTrigger>
                    <SelectContent>{[10, 20, 50, 100, 200, 500].map(p => (<SelectItem key={p} value={`${p}`}>{p}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <PaginationNav totalPages={Math.ceil(summaryData.length / summaryItemsPerPage)} currentPage={summaryCurrentPage} onPageChange={setSummaryCurrentPage} />
              </div>
            </CardFooter>
       </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Produção Diária (Nº de Páginas)</CardTitle></CardHeader>
            <CardContent><ChartContainer config={chartConfig} className="h-[250px] w-full cursor-pointer"><BarChart data={chartData.byDay} onClick={handleChartClick}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis allowDecimals={false} /><Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={4} /></BarChart></ChartContainer></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>{getChartTitle()}</CardTitle></CardHeader>
            <CardContent><ChartContainer config={chartConfig} className="h-[250px] w-full cursor-pointer"><PieChart onClick={handleChartClick}><Tooltip content={<ChartTooltipContent hideLabel />} /><Pie data={chartData.byType} dataKey="value" nameKey="name" innerRadius={50} label>{chartData.byType.map(e => <Cell key={e.name} fill={e.fill} />)}</Pie><Legend /></PieChart></ChartContainer></CardContent>
        </Card>
      </div>

      <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Tabela de Produção Detalhada</CardTitle>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => exportData(selectedTasks, 'selected_tasks.xlsx')} disabled={selectedTasks.length === 0}>Exportar Selecionados ({selectedTasks.length})</DropdownMenuItem><DropdownMenuItem onSelect={() => exportData(tasksForDetailedView, 'all_tasks.xlsx')}>Exportar Todos ({tasksForDetailedView.length})</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"><Checkbox checked={paginatedDetailedTasks.length > 0 && detailedSelection.length === paginatedDetailedTasks.length} onCheckedChange={(checked) => setDetailedSelection(checked ? paginatedDetailedTasks.map(t => t.id) : [])} /></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('completedAt', setDetailedSorting)}>Data {getSortIndicator('completedAt', detailedSorting)}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('userName', setDetailedSorting)}>Utilizador {getSortIndicator('userName', detailedSorting)}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('taskType', setDetailedSorting)}>Tarefa {getSortIndicator('taskType', detailedSorting)}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('bookName', setDetailedSorting)}>Livro {getSortIndicator('bookName', detailedSorting)}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('projectName', setDetailedSorting)}>Projeto {getSortIndicator('projectName', detailedSorting)}</div></TableHead>
                            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer" onClick={() => handleSort('pageCount', setDetailedSorting)}>Páginas {getSortIndicator('pageCount', detailedSorting)}</div></TableHead>
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
                        {paginatedDetailedTasks.map(task => (
                            <TableRow key={task.id} data-state={detailedSelection.includes(task.id) && "selected"}>
                                <TableCell><Checkbox checked={detailedSelection.includes(task.id)} onCheckedChange={(checked) => setDetailedSelection(prev => checked ? [...prev, task.id] : prev.filter(id => id !== task.id))} /></TableCell>
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
                <div className="text-xs text-muted-foreground">{detailedSelection.length > 0 ? `${detailedSelection.length} de ${tasksForDetailedView.length} tarefa(s) selecionada(s).` : `A mostrar ${paginatedDetailedTasks.length > 0 ? (detailedCurrentPage - 1) * detailedItemsPerPage + 1 : 0}-${(detailedCurrentPage - 1) * detailedItemsPerPage + paginatedDetailedTasks.length} de ${tasksForDetailedView.length} tarefas`}</div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2 text-xs">
                      <p className="text-muted-foreground">Itens por página</p>
                      <Select value={`${detailedItemsPerPage}`} onValueChange={(value) => { setDetailedItemsPerPage(Number(value)); setDetailedCurrentPage(1); }}>
                        <SelectTrigger className="h-7 w-[70px]"><SelectValue placeholder={detailedItemsPerPage} /></SelectTrigger>
                        <SelectContent>{[10, 20, 50, 100, 200, 500].map(p => (<SelectItem key={p} value={`${p}`}>{p}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <PaginationNav totalPages={Math.ceil(tasksForDetailedView.length / detailedItemsPerPage)} currentPage={detailedCurrentPage} onPageChange={setDetailedCurrentPage} />
                </div>
            </CardFooter>
       </Card>

       <Dialog open={dialogState.open} onOpenChange={(open) => setDialogState({ ...dialogState, open })}>
          <DialogContent className="max-w-4xl">
              <DialogHeader>
                  <DialogTitle>{dialogState.title}</DialogTitle>
                  <DialogDescription>A mostrar {dialogState.items.length} tarefas relacionadas.</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                  <Input placeholder="Filtrar por livro ou projeto..." value={dialogFilter} onChange={(e) => setDialogFilter(e.target.value)} />
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-4">
                   <Table>
                      <TableHeader><TableRow><TableHead>Livro</TableHead><TableHead>Projeto</TableHead><TableHead>Utilizador</TableHead><TableHead>Tipo Tarefa</TableHead><TableHead>Páginas</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {dialogState.items.filter(item => item.bookName.toLowerCase().includes(dialogFilter.toLowerCase()) || item.projectName.toLowerCase().includes(dialogFilter.toLowerCase())).map(item => {
                              const book = allProjects.flatMap(p => p.books).find(b => b.id === item.bookId);
                              return (
                                  <TableRow key={item.id}>
                                      <TableCell><Link href={`/books/${item.bookId}`} className="hover:underline font-medium">{item.bookName}</Link></TableCell>
                                      <TableCell>{item.projectName}</TableCell>
                                      <TableCell>{item.userName}</TableCell>
                                      <TableCell><Badge variant="secondary">{item.taskType}</Badge></TableCell>
                                      <TableCell>{item.pageCount}</TableCell>
                                  </TableRow>
                              )
                          })}
                      </TableBody>
                   </Table>
              </div>
          </DialogContent>
       </Dialog>
    </div>
  )
}
