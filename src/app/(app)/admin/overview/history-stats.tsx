
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ChevronsUpDown, Download, History, ListChecks, CalendarDays } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import Link from "next/link"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from 'date-fns'
import { EnrichedAuditLog } from "@/context/workflow-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"


const ITEMS_PER_PAGE = 20;

export function HistoryStatsTab() {
  const { auditLogs } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'date', desc: true }])
  const [currentPage, setCurrentPage] = React.useState(1);
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: EnrichedAuditLog[] }>({ open: false, title: '', items: [] });
  const { toast } = useToast();

  const kpiData = React.useMemo(() => {
      const today = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().slice(0, 10);
      const logsToday = auditLogs.filter(log => log.date.startsWith(today));
      const logsWeek = auditLogs.filter(log => log.date >= sevenDaysAgo);
      return {
          total: { value: auditLogs.length, items: auditLogs },
          today: { value: logsToday.length, items: logsToday },
          week: { value: logsWeek.length, items: logsWeek },
      };
  }, [auditLogs]);
  
  const activityByDayChartData = React.useMemo(() => {
    const activityMap: {[key: string]: number} = {};
    const dateRange = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    dateRange.forEach(date => activityMap[date] = 0);
    auditLogs.forEach(log => {
      const date = log.date.slice(0, 10);
      if(activityMap[date] !== undefined) activityMap[date]++;
    });
    return Object.entries(activityMap).map(([date, count]) => ({ date: format(new Date(date), 'MMM d'), count }));
  }, [auditLogs]);

  const activityByTypeChartData = React.useMemo(() => {
    const typeMap = auditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
    }, {} as {[key: string]: number});
    return Object.entries(typeMap).map(([name, value]) => ({ name, value, fill: `hsl(${Math.random() * 360}, 70%, 50%)` }));
  }, [auditLogs]);

  const chartConfig: ChartConfig = { count: { label: "Actions", color: "hsl(var(--chart-1))" } };

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

  const sortedAndFilteredLogs = React.useMemo(() => {
    let filtered = auditLogs;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(log => {
          const logValue = log[columnId as keyof typeof log]
          return String(logValue).toLowerCase().includes(value.toLowerCase())
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
  }, [auditLogs, columnFilters, sorting])
  
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
    const data = sortedAndFilteredLogs;
    if (format === 'json') {
        downloadFile(JSON.stringify(data, null, 2), 'history.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'history.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
        XLSX.writeFile(workbook, 'history.xlsx');
    }
    toast({ title: 'Export Complete', description: `${data.length} log entries exported.` });
  };

  const handleKpiClick = (title: string, items: EnrichedAuditLog[]) => {
    setDialogState({ open: true, title, items });
  }

  const totalPages = Math.ceil(sortedAndFilteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = sortedAndFilteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) { pageNumbers.push(i); }
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) { pageNumbers.push(-1); }
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 2) { end = 3; }
        if (currentPage >= totalPages - 1) { start = totalPages - 2; }
        for (let i = start; i <= end; i++) { pageNumbers.push(i); }
        if (currentPage < totalPages - 2) { pageNumbers.push(-1); }
        pageNumbers.push(totalPages);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          {pageNumbers.map((num, i) => num === -1 ? <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={num}><PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>{num}</PaginationLink></PaginationItem>)}
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('All Log Entries', kpiData.total.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Log Entries</CardTitle><History className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.total.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Todays Log Entries', kpiData.today.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Logs Today</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.today.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('This Weeks Log Entries', kpiData.week.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Logs This Week</CardTitle><ListChecks className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.week.value}</div></CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Activity by Type</CardTitle></CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="h-[250px] w-full">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={activityByTypeChartData} dataKey="value" nameKey="name" innerRadius={50} />
                        </PieChart>
                     </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Activity (Last 14 Days)</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <LineChart data={activityByDayChartData} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
                            <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide/>
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                            <Line dataKey="count" type="natural" stroke="var(--color-count)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>System Audit Log</CardTitle>
                    <CardDescription>A complete log of all actions performed across the application.</CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => exportData('xlsx')}>Export as XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('json')}>Export as JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportData('csv')}>Export as CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('date')}>Date & Time {getSortIndicator('date')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('action')}>Action {getSortIndicator('action')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('user')}>User {getSortIndicator('user')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('details')}>Details {getSortIndicator('details')}</div></TableHead>
            </TableRow>
            <TableRow>
                <TableHead><Input placeholder="Filter date..." value={columnFilters['date'] || ''} onChange={e => setColumnFilters(p => ({...p, date: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter action..." value={columnFilters['action'] || ''} onChange={e => setColumnFilters(p => ({...p, action: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter user..." value={columnFilters['user'] || ''} onChange={e => setColumnFilters(p => ({...p, user: e.target.value}))} className="h-8"/></TableHead>
                <TableHead>
                    <div className="flex items-center justify-between">
                        <Input placeholder="Filter details..." value={columnFilters['details'] || ''} onChange={e => setColumnFilters(p => ({...p, details: e.target.value}))} className="h-8"/>
                        <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button>
                    </div>
                </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {paginatedLogs.map(log => (
                <TableRow key={log.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(log.date).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>
                    {log.bookId ? (
                        <Link href={`/books/${log.bookId}`} className="hover:underline">{log.details}</Link>
                    ) : (
                        log.details
                    )}
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
                {`Showing ${paginatedLogs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to ${(currentPage - 1) * ITEMS_PER_PAGE + paginatedLogs.length} of ${sortedAndFilteredLogs.length} log entries`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>
      
        <Dialog open={dialogState.open} onOpenChange={() => setDialogState(prev => ({ ...prev, open: false }))}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{dialogState.title}</DialogTitle>
                    <DialogDescription>Showing {dialogState.items.length} log entries.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     <Table>
                        <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dialogState.items.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.action}</TableCell>
                                    <TableCell>{log.user}</TableCell>
                                    <TableCell>{new Date(log.date).toLocaleString()}</TableCell>
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
