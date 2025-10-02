
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
import { ArrowUp, ArrowDown, ChevronsUpDown, Download, User, UserCheck, UserX, Activity } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { User as UserData } from "@/lib/data";
import { TypeOf } from "zod";

const getInitials = (name: string) => {
    if (!name) return ""
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

type UserStat = {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
  status: "active" | "disabled";
  totalActions: number;
  scannedCount: number;
  indexedCount: number;
  checkedCount: number;
};

export function OperationalUserStatsTab() {
  const { users, auditLogs } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: UserData[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');
  const { toast } = useToast();

  const operationalUsers = React.useMemo(() => users.filter(u => u.role !== 'System' && u.role !== 'Client'), [users]);

  /*const userStats = React.useMemo((): UserStat[] => {
    return operationalUsers.map(user => {
      const userLogs = auditLogs.filter(log => log.userId === user.id)
      const scannedCount = userLogs.filter(log => log.action === 'Scanning Finished').length
      const indexedCount = userLogs.filter(log => log.action === 'Assigned for QC').length
      const checkedCount = userLogs.filter(log => log.action === 'Initial QC Complete').length
      
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        totalActions: userLogs.length,
        scannedCount,
        indexedCount,
        checkedCount
      }
    })
  }, [operationalUsers, auditLogs])*/
  const [userStats, setUserStats] = React.useState<UserStat[]>([]);

React.useEffect(() => {
  const stats = operationalUsers.map(user => {
    const userLogs = auditLogs.filter(log => log.userId === user.id);
    const scannedCount = userLogs.filter(log => log.action === 'Scanning Finished').length;
    const indexedCount = userLogs.filter(log => log.action === 'Assigned for QC').length;
    const checkedCount = userLogs.filter(log => log.action === 'Initial QC Complete').length;

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      totalActions: userLogs.length,
      scannedCount,
      indexedCount,
      checkedCount,
    };
  });

  setUserStats(stats);
}, [operationalUsers, auditLogs]);


  /*const kpiData = React.useMemo(() => {
    const mostActive = userStats.sort((a,b) => b.totalActions - a.totalActions)[0];
    return {
        totalUsers: { value: operationalUsers.length, items: operationalUsers },
        activeUsers: { value: operationalUsers.filter(u => u.status === 'active').length, items: operationalUsers.filter(u => u.status === 'active') },
        disabledUsers: { value: operationalUsers.filter(u => u.status === 'disabled').length, items: operationalUsers.filter(u => u.status === 'disabled') },
        mostActiveUser: { value: mostActive?.name || 'N/A', actions: mostActive?.totalActions || 0 }
    };
  }, [operationalUsers, userStats]);

  const usersByRoleChartData = React.useMemo(() => {
    const byRole = operationalUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {} as {[key: string]: number});
    return Object.entries(byRole).map(([name, value]) => ({ name, value, fill: `hsl(${Math.random() * 360}, 70%, 50%)` }));
  }, [operationalUsers]);
  
  const actionsPerUserChartData = React.useMemo(() => (
    userStats.map(u => ({ name: u.name, actions: u.totalActions })).sort((a,b) => b.actions - a.actions).slice(0, 10)
  ), [userStats]);*/

  type KpiData = {
  totalUsers: { value: number; items: UserData[] };
  activeUsers: { value: number; items: UserData[] };
  disabledUsers: { value: number; items: UserData[] };
  mostActiveUser: { value: string; actions: number };
    };

    type RoleChartItem = {
      name: string;
      value: number;
      fill: string;
    };

    type ActionChartItem = {
      name: string;
      actions: number;
    };

  const [kpiData, setKpiData] = React.useState<KpiData>({
    totalUsers: { value: 0, items: [] },
    activeUsers: { value: 0, items: [] },
    disabledUsers: { value: 0, items: [] },
    mostActiveUser: { value: 'N/A', actions: 0 },
  });

  React.useEffect(() => {
    const mostActive = [...userStats].sort((a, b) => b.totalActions - a.totalActions)[0];

    setKpiData({
      totalUsers: { value: operationalUsers.length, items: operationalUsers },
      activeUsers: {
        value: operationalUsers.filter(u => u.status === 'active').length,
        items: operationalUsers.filter(u => u.status === 'active'),
      },
      disabledUsers: {
        value: operationalUsers.filter(u => u.status === 'disabled').length,
        items: operationalUsers.filter(u => u.status === 'disabled'),
      },
      mostActiveUser: {
        value: mostActive?.name || 'N/A',
        actions: mostActive?.totalActions || 0,
      },
    });
  }, [operationalUsers, userStats]);

  const [usersByRoleChartData, setUsersByRoleChartData] = React.useState<RoleChartItem[]>([]);

  React.useEffect(() => {
    const byRole = operationalUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(byRole).map(([name, value]) => ({
      name,
      value,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
    }));

    setUsersByRoleChartData(chartData);
  }, [operationalUsers]);


  const [actionsPerUserChartData, setActionsPerUserChartData] = React.useState<ActionChartItem[]>([]);

  React.useEffect(() => {
    const chartData = userStats
      .map(u => ({ name: u.name, actions: u.totalActions }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 10);

    setActionsPerUserChartData(chartData);
  }, [userStats]);



  
  const chartConfig: ChartConfig = {
    actions: { label: "Actions", color: "hsl(var(--chart-1))" },
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

  const sortedAndFilteredUsers = React.useMemo(() => {
    let filtered = userStats;
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
  }, [userStats, columnFilters, sorting])



  /*type SortingRule = {
    id: keyof UserStat;
    desc: boolean;
  };

  type ColumnFilters = Record<string, string>;

  const [sortedAndFilteredUsers, setSortedAndFilteredUsers] = React.useState<UserStat[]>([]);

  React.useEffect(() => {
    let filtered = userStats;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(user => {
          const userValue = user[columnId as keyof UserStat];
          return String(userValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      const s = sorting[0];
      filtered = [...filtered].sort((a, b) => {
        const valA = a[s.id as keyof UserStat];
        const valB = b[s.id as keyof UserStat];
        const result = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        return s.desc ? -result : result;
      });
    }

    setSortedAndFilteredUsers(filtered);
  }, [userStats, columnFilters, sorting]);*/

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
        downloadFile(JSON.stringify(data, null, 2), 'operator_stats.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'operator_stats.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Operators');
        XLSX.writeFile(workbook, 'operator_stats.xlsx');
    }
    toast({ title: "Exportação Concluída", description: `${data.length} operadores exportados.` });
  };
  
  const handleKpiClick = (title: string, items: UserData[]) => {
    setDialogFilter('');
    setDialogState({ open: true, title, items });
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Todos os Operadores', kpiData.totalUsers.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Operadores</CardTitle><User className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.totalUsers.value}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Operadores Ativos', kpiData.activeUsers.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Operadores Ativos</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.activeUsers.value}</div></CardContent>
            </Card>
             <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Utilizadores Desativados', kpiData.disabledUsers.items)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Operadores Desativados</CardTitle><UserX className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.disabledUsers.value}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Operador Mais Ativo</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.mostActiveUser.value}</div><p className="text-xs text-muted-foreground">{kpiData.mostActiveUser.actions} ações registradas</p></CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Operadores por Perfil</CardTitle></CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="h-[250px] w-full">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={usersByRoleChartData} dataKey="value" nameKey="name" innerRadius={50} />
                        </PieChart>
                     </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top 10 Operadores por Ações</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={actionsPerUserChartData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={100} />
                            <XAxis dataKey="actions" type="number" hide />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                            <Bar dataKey="actions" radius={4} fill="var(--color-actions)" />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Produtividade do Operador</CardTitle>
                    <CardDescription>Uma visão geral das principais métricas de produtividade para cada operador.</CardDescription>
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
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('role')}>Perfil {getSortIndicator('role')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}>Estado {getSortIndicator('status')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalActions')}>Total Ações {getSortIndicator('totalActions')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('scannedCount')}>Livros Digitalizados {getSortIndicator('scannedCount')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('indexedCount')}>Livros Indexados {getSortIndicator('indexedCount')}</div></TableHead>
                <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('checkedCount')}>Livros Verificados P.Checker {getSortIndicator('checkedCount')}</div></TableHead>
            </TableRow>
            <TableRow>
                <TableHead><Input placeholder="Filtrar utilizador..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar perfil..." value={columnFilters['role'] || ''} onChange={e => setColumnFilters(p => ({...p, role: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
                <TableHead colSpan={4}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Limpar Filtros</Button></TableHead>
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
                <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                <TableCell><Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={cn("capitalize", user.status === 'active' && "bg-green-600")}>{user.status}</Badge></TableCell>
                <TableCell className="text-center">{user.totalActions}</TableCell>
                <TableCell className="text-center">{user.scannedCount}</TableCell>
                <TableCell className="text-center">{user.indexedCount}</TableCell>
                <TableCell className="text-center">{user.checkedCount}</TableCell>
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

    