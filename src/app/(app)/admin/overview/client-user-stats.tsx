
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ChevronsUpDown, Download, User, UserCheck, UserX, Users } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { User as UserData } from "@/lib/data";

const getInitials = (name: string) => {
    if (!name) return ""
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

type ClientUserStat = {
  id: string;
  name: string;
  avatar?: string | null;
  clientName: string;
  status: "active" | "disabled";
  lastLogin?: string;
};

export function ClientUserStatsTab() {
  const { users, clients } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: UserData[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');
  const { toast } = useToast();

  const clientUsers = React.useMemo(() => users.filter(u => u.clientId !== null), [users]);
  
  const clientUserStats = React.useMemo((): ClientUserStat[] => {
    return clientUsers.map(user => {
      const clientName = clients.find(c => c.id === user.clientId)?.name || 'N/A';
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        clientName: clientName,
        status: user.status,
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
      }
    })
  }, [clientUsers, clients]);
  
  const kpiData = React.useMemo(() => {
    return {
        totalUsers: { value: clientUsers.length, items: clientUsers },
        activeUsers: { value: clientUsers.filter(u => u.status === 'active').length, items: clientUsers.filter(u => u.status === 'active') },
        disabledUsers: { value: clientUsers.filter(u => u.status === 'disabled').length, items: clientUsers.filter(u => u.status === 'disabled') },
        clientsWithUsers: { value: new Set(clientUsers.map(u => u.clientId)).size },
    };
  }, [clientUsers]);

  const usersByClientChartData = React.useMemo(() => {
    const byClient = clientUsers.reduce((acc, user) => {
        const clientName = clients.find(c => c.id === user.clientId)?.name || 'Unknown';
        acc[clientName] = (acc[clientName] || 0) + 1;
        return acc;
    }, {} as {[key: string]: number});
    return Object.entries(byClient).map(([name, value]) => ({ name, value, fill: `hsl(${Math.random() * 360}, 70%, 50%)` }));
  }, [clientUsers, clients]);

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

  const sortedAndFilteredUsers = React.useMemo(() => {
    let filtered = clientUserStats;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(user => {
          const userValue = user[columnId as keyof typeof user]
          return String(userValue).toLowerCase().includes(value.toLowerCase())
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
  }, [clientUserStats, columnFilters, sorting])

  const filteredDialogItems = React.useMemo(() => {
    if (!dialogFilter) return dialogState.items;
    const query = dialogFilter.toLowerCase();
    return dialogState.items.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        u.status.toLowerCase().includes(query)
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
    const data = sortedAndFilteredUsers;
    if (format === 'json') {
        downloadFile(JSON.stringify(data, null, 2), 'client_users_stats.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'client_users_stats.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Client Users');
        XLSX.writeFile(workbook, 'client_users_stats.xlsx');
    }
    toast({ title: "Exportação Concluída", description: `${data.length} utilizadores de cliente exportados.` });
  };
  
  const handleKpiClick = (title: string, items: UserData[]) => {
    setDialogFilter('');
    setDialogState({ open: true, title, items });
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Todos os Utilizadores de Cliente', kpiData.totalUsers.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Utilizadores de Cliente</CardTitle><User className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.totalUsers.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Utilizadores Ativos', kpiData.activeUsers.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Utilizadores Ativos</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.activeUsers.value}</div></CardContent>
            </Card>
             <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Utilizadores Desativados', kpiData.disabledUsers.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Utilizadores Desativados</CardTitle><UserX className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.disabledUsers.value}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Clientes com Utilizadores</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.clientsWithUsers.value}</div></CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Utilizadores de Cliente por Empresa</CardTitle></CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="h-[250px] w-full">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={usersByClientChartData} dataKey="value" nameKey="name" innerRadius={50} />
                        </PieChart>
                     </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Utilizadores por Estado</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="h-[250px] w-full">
                       <BarChart data={[{name: 'Active', value: kpiData.activeUsers.value, fill: 'hsl(var(--chart-1))'}, {name: 'Disabled', value: kpiData.disabledUsers.value, fill: 'hsl(var(--destructive))'}]} layout="vertical">
                         <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
                         <XAxis type="number" hide />
                         <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                         <Bar dataKey="value" radius={4} />
                       </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Contas de Utilizador de Cliente</CardTitle>
                    <CardDescription>Uma lista de todas as contas de utilizador de cliente externas.</CardDescription>
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
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Utilizador {getSortIndicator('name')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('clientName')}>Empresa do Cliente {getSortIndicator('clientName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}>Estado {getSortIndicator('status')}</div></TableHead>
                <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer select-none group" onClick={() => handleSort('lastLogin')}>Último Login {getSortIndicator('lastLogin')}</div></TableHead>
            </TableRow>
            <TableRow>
                <TableHead><Input placeholder="Filtrar utilizador..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar empresa..." value={columnFilters['clientName'] || ''} onChange={e => setColumnFilters(p => ({...p, clientName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><div className="flex items-center justify-between"><Input placeholder="Filter login..." value={columnFilters['lastLogin'] || ''} onChange={e => setColumnFilters(p => ({...p, lastLogin: e.target.value}))} className="h-8"/><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Limpar Filtros</Button></div></TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {sortedAndFilteredUsers.map(user => (
                <TableRow key={user.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                        {user.avatar && <AvatarImage src={user.avatar} alt="User avatar" data-ai-hint="person avatar"/>}
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                    </div>
                </TableCell>
                <TableCell>{user.clientName}</TableCell>
                <TableCell><Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={cn("capitalize", user.status === 'active' && "bg-green-600")}>{user.status}</Badge></TableCell>
                <TableCell className="text-right">{user.lastLogin}</TableCell>
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
                    <DialogDescription>A mostrar {filteredDialogItems.length} de {dialogState.items.length} utilizadores.</DialogDescription>
                </DialogHeader>
                 <div className="py-2">
                    <Input 
                        placeholder="Filtrar utilizadores..."
                        value={dialogFilter}
                        onChange={(e) => setDialogFilter(e.target.value)}
                    />
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                     <Table>
                        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Perfil</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredDialogItems.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3"><Avatar className="h-9 w-9">{user.avatar && <AvatarImage src={user.avatar} alt="User avatar" />}{!user.avatar && <AvatarFallback>{getInitials(user.name)}</AvatarFallback>}</Avatar>
                                      <span className="font-medium">{user.name}</span></div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                    <TableCell><Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={cn("capitalize", user.status === 'active' && "bg-green-600")}>{user.status}</Badge></TableCell>
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

    