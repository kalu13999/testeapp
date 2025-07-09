
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
import { ArrowUp, ArrowDown, ChevronsUpDown, Download, Briefcase, BookCopy, CheckCheck, AlertTriangle } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import Link from "next/link"
import type { EnrichedBook } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"


const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': case 'Finalized': case 'Archived': return 'default';
        case 'In Processing': case 'Scanning Started': case 'Indexing Started': case 'Checking Started': return 'secondary';
        case 'Client Rejected': return 'destructive';
        default: return 'outline';
    }
}

export function BookStatsTab() {
  const { allProjects, documents } = useAppContext()
  const books = React.useMemo(() => allProjects.flatMap(p => p.books), [allProjects]);
  
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: EnrichedBook[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');
  const { toast } = useToast();

  const bookStats = React.useMemo(() => {
    return books.map(book => {
      const errorDocs = documents.filter(d => d.bookId === book.id && d.flag === 'error');
      return {
        ...book,
        hasError: errorDocs.length > 0,
      }
    })
  }, [books, documents]);
  
  const kpiData = React.useMemo(() => {
      const booksInWorkflow = books.filter(b => !['Pending Shipment', 'Complete', 'Archived', 'Finalized'].includes(b.status));
      const finalizedBooks = books.filter(b => ['Complete', 'Archived', 'Finalized'].includes(b.status));
      const booksWithErrors = bookStats.filter(b => b.hasError);

      return {
          total: { value: books.length, items: books },
          inWorkflow: { value: booksInWorkflow.length, items: booksInWorkflow },
          finalized: { value: finalizedBooks.length, items: finalizedBooks },
          withErrors: { value: booksWithErrors.length, items: booksWithErrors },
      };
  }, [books, bookStats]);

  const booksByStatusChartData = React.useMemo(() => {
    const statusCounts = books.reduce((acc, book) => {
        const status = book.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as {[key: string]: number});
    
    const sortedData = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
    
    const topN = 5;
    if (sortedData.length > topN) {
      const topData = sortedData.slice(0, topN);
      const otherValue = sortedData.slice(topN).reduce((sum, item) => sum + item.value, 0);
      return [...topData, { name: 'Other', value: otherValue }];
    }

    return sortedData;
  }, [books]);
  
  const booksByProjectChartData = React.useMemo(() => (
    allProjects.map(p => ({ name: p.name, books: p.books.length }))
      .sort((a, b) => b.books - a.books)
      .slice(0, 10)
  ), [allProjects]);
  
  const chartConfig = { 
    books: { label: "Books", color: "hsl(var(--chart-1))" },
    value: { label: "Books" }
  } satisfies ChartConfig;
  
  // Dynamically create chart config for pie chart
  const statusChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    booksByStatusChartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`
      }
    })
    return config;
  }, [booksByStatusChartData]);

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

  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = bookStats;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof typeof book]
          return String(bookValue).toLowerCase().includes(value.toLowerCase())
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
  }, [bookStats, columnFilters, sorting])

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
    const data = sortedAndFilteredBooks;
    if (format === 'json') {
        downloadFile(JSON.stringify(data, null, 2), 'books.json', 'application/json');
    } else if (format === 'csv') {
        const headers = ['id', 'name', 'clientName', 'projectName', 'status', 'progress', 'documentCount', 'totalExpected', 'priority'];
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'books.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Books');
        XLSX.writeFile(workbook, 'books.xlsx');
    }
    toast({ title: 'Export Complete', description: `${data.length} books exported.` });
  };
  
  const handleKpiClick = (title: string, items: EnrichedBook[]) => {
    setDialogFilter('');
    setDialogState({ open: true, title, items });
  }

  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Total Books', kpiData.total.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Books</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.total.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Books In Workflow', kpiData.inWorkflow.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">In Workflow</CardTitle><BookCopy className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.inWorkflow.value}</div></CardContent>
            </Card>
             <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Finalized Books', kpiData.finalized.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Finalized</CardTitle><CheckCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.finalized.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Books with Errors', kpiData.withErrors.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">With Errors</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold text-destructive">{kpiData.withErrors.value}</div></CardContent>
            </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Books by Status</CardTitle>
                    <CardDescription>Top 5 statuses shown, with others grouped.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer
                        config={statusChartConfig}
                        className="mx-auto aspect-square h-[250px]"
                    >
                        <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={booksByStatusChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            {booksByStatusChartData.map((entry) => (
                                <Cell key={entry.name} fill={statusChartConfig[entry.name]?.color} />
                            ))}
                        </Pie>
                        <ChartLegend
                            content={<ChartLegendContent nameKey="name" />}
                            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                        />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top 10 Projects by Book Count</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={booksByProjectChartData} layout="vertical" margin={{ left: 50 }}>
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
              <CardTitle>All Books</CardTitle>
              <CardDescription>A detailed list of all books in the system.</CardDescription>
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
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Book Name {getSortIndicator('name')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Project {getSortIndicator('projectName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('clientName')}>Client {getSortIndicator('clientName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}>Status {getSortIndicator('status')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('priority')}>Priority {getSortIndicator('priority')}</div></TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('documentCount')}>Pages {getSortIndicator('documentCount')}</div></TableHead>
              </TableRow>
              <TableRow>
                <TableHead><Input placeholder="Filter name..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter project..." value={columnFilters['projectName'] || ''} onChange={e => setColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter client..." value={columnFilters['clientName'] || ''} onChange={e => setColumnFilters(p => ({...p, clientName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter status..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter priority..." value={columnFilters['priority'] || ''} onChange={e => setColumnFilters(p => ({...p, priority: e.target.value}))} className="h-8"/></TableHead>
                <TableHead colSpan={2}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredBooks.map(book => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell>
                  <TableCell>{book.projectName}</TableCell>
                  <TableCell>{book.clientName}</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(book.status)}>{book.status}</Badge></TableCell>
                  <TableCell>{book.priority}</TableCell>
                  <TableCell><Progress value={book.progress} className="h-2"/></TableCell>
                  <TableCell className="text-center">{book.documentCount} / {book.expectedDocuments}</TableCell>
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
                    <DialogDescription>Showing {filteredDialogItems.length} of {dialogState.items.length} books.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Input 
                        placeholder="Filter books..."
                        value={dialogFilter}
                        onChange={(e) => setDialogFilter(e.target.value)}
                    />
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     <Table>
                        <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Project</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredDialogItems.map(book => (
                                <TableRow key={book.id}>
                                    <TableCell><Link href={`/books/${book.id}`} className="hover:underline font-medium">{book.name}</Link></TableCell>
                                    <TableCell>{book.projectName}</TableCell>
                                    <TableCell>{book.clientName}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(book.status)}>{book.status}</Badge></TableCell>
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
