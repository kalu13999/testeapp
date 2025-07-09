
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
import { ArrowUp, ArrowDown, ChevronsUpDown, Download, Users, Briefcase, DollarSign } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

type ClientStat = {
  id: string,
  name: string,
  totalProjects: number,
  activeProjects: number,
  onHoldProjects: number,
  totalBooks: number,
  finalizedBooks: number,
  avgBudget: string,
  totalBudget: number
};

export function ClientStatsTab() {
  const { allProjects, clients } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: ClientStat[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');
  const { toast } = useToast();

  const clientStats = React.useMemo((): ClientStat[] => {
    return clients.map(client => {
      const projectsForClient = allProjects.filter(p => p.clientId === client.id)
      const activeProjects = projectsForClient.filter(p => p.status === 'In Progress').length
      const onHoldProjects = projectsForClient.filter(p => p.status === 'On Hold').length
      const totalBooks = projectsForClient.reduce((sum, p) => sum + p.books.length, 0)
      const finalizedBooks = projectsForClient.reduce((sum, p) => sum + p.books.filter(b => b.status === 'Finalized').length, 0)
      const totalBudget = projectsForClient.reduce((sum, p) => sum + p.budget, 0)
      const avgBudget = projectsForClient.length > 0 ? totalBudget / projectsForClient.length : 0

      return {
        id: client.id,
        name: client.name,
        totalProjects: projectsForClient.length,
        activeProjects,
        onHoldProjects,
        totalBooks,
        finalizedBooks,
        totalBudget: totalBudget,
        avgBudget: avgBudget.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      }
    })
  }, [allProjects, clients])

  const kpiData = React.useMemo(() => ({
    totalClients: clients.length,
    totalBudget: allProjects.reduce((sum, p) => sum + p.budget, 0),
    avgProjects: clients.length > 0 ? (allProjects.length / clients.length).toFixed(1) : 0,
  }), [clients, allProjects]);

  const projectsPerClientChartData = React.useMemo(() => (
    clientStats.map(c => ({ name: c.name, projects: c.totalProjects })).sort((a,b) => b.projects - a.projects).slice(0, 10)
  ), [clientStats]);

  const budgetPerClientChartData = React.useMemo(() => (
    clientStats.map(c => ({ name: c.name, budget: c.totalBudget })).sort((a,b) => b.budget - a.budget).slice(0, 10)
  ), [clientStats]);

  const chartConfig: ChartConfig = {
    projects: { label: "Projects", color: "hsl(var(--chart-1))" },
    budget: { label: "Budget", color: "hsl(var(--chart-2))" },
  };

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

  const sortedAndFilteredClients = React.useMemo(() => {
    let filtered = clientStats;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(client => {
          const clientValue = client[columnId as keyof typeof client]
          return String(clientValue).toLowerCase().includes(value.toLowerCase())
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
  }, [clientStats, columnFilters, sorting])
  
  const filteredDialogItems = React.useMemo(() => {
    if (!dialogFilter) return dialogState.items;
    const query = dialogFilter.toLowerCase();
    return dialogState.items.filter(c => 
        c.name.toLowerCase().includes(query) ||
        String(c.totalProjects).includes(query) ||
        c.avgBudget.toLowerCase().includes(query)
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
    const data = sortedAndFilteredClients;
    if (format === 'json') {
        downloadFile(JSON.stringify(data, null, 2), 'clients_stats.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'clients_stats.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
        XLSX.writeFile(workbook, 'clients_stats.xlsx');
    }
    toast({ title: 'Export Complete', description: `${data.length} clients exported.` });
  };
  
  const handleKpiClick = (title: string, items: ClientStat[]) => {
    setDialogFilter('');
    setDialogState({ open: true, title, items });
  }

  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('All Clients', clientStats)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Clients</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.totalClients}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Budget</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.totalBudget.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Projects / Client</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.avgProjects}</div></CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Top 10 Clients by Project Count</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={projectsPerClientChartData} layout="vertical" margin={{ left: 50 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={120} />
                            <XAxis dataKey="projects" type="number" hide />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                            <Bar dataKey="projects" radius={4} fill="var(--color-projects)" />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top 10 Clients by Total Budget</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={budgetPerClientChartData} layout="vertical" margin={{ left: 50 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={120} />
                            <XAxis dataKey="budget" type="number" hide tickFormatter={(value) => `$${(value as number / 1000).toFixed(0)}k`} />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent formatter={(value) => (value as number).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />} />
                            <Bar dataKey="budget" radius={4} fill="var(--color-budget)" />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Client Statistics</CardTitle>
                        <CardDescription>An aggregated overview of metrics for each client.</CardDescription>
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
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Client Name {getSortIndicator('name')}</div></TableHead>
                    <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalProjects')}>Total Projects {getSortIndicator('totalProjects')}</div></TableHead>
                    <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('activeProjects')}>Active Projects {getSortIndicator('activeProjects')}</div></TableHead>
                    <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('onHoldProjects')}>On Hold {getSortIndicator('onHoldProjects')}</div></TableHead>
                    <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalBooks')}>Total Books {getSortIndicator('totalBooks')}</div></TableHead>
                    <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('finalizedBooks')}>Finalized Books {getSortIndicator('finalizedBooks')}</div></TableHead>
                    <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer select-none group" onClick={() => handleSort('avgBudget')}>Avg. Project Budget {getSortIndicator('avgBudget')}</div></TableHead>
                </TableRow>
                <TableRow>
                    <TableHead><Input placeholder="Filter name..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
                    <TableHead colSpan={6}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedAndFilteredClients.map(client => (
                    <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-center">{client.totalProjects}</TableCell>
                    <TableCell className="text-center">{client.activeProjects}</TableCell>
                    <TableCell className="text-center">{client.onHoldProjects}</TableCell>
                    <TableCell className="text-center">{client.totalBooks}</TableCell>
                    <TableCell className="text-center">{client.finalizedBooks}</TableCell>
                    <TableCell className="text-right">{client.avgBudget}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        
        <Dialog open={dialogState.open} onOpenChange={(open) => { if (!open) setDialogFilter(''); setDialogState(prev => ({ ...prev, open })); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{dialogState.title}</DialogTitle>
                    <DialogDescription>Showing {filteredDialogItems.length} of {dialogState.items.length} clients.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Input 
                        placeholder="Filter clients..."
                        value={dialogFilter}
                        onChange={(e) => setDialogFilter(e.target.value)}
                    />
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     <Table>
                        <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Total Projects</TableHead><TableHead>Avg. Budget</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredDialogItems.map(client => (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell>{client.totalProjects}</TableCell>
                                    <TableCell>{client.avgBudget}</TableCell>
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

    