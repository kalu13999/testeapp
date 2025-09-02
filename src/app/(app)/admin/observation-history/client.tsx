

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns'
import { EnrichedAuditLog } from "@/context/workflow-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BookObservation } from "@/lib/data"


const ITEMS_PER_PAGE = 20;

export default function ObservationHistoryClient() {
  const { bookObservations, users, books, selectedProjectId } = useAppContext();
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'created_at', desc: true }]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const { toast } = useToast();

  const enrichedObservations = React.useMemo(() => {
    return bookObservations.map(obs => {
        const user = users.find(u => u.id === obs.user_id);
        const book = books.find(b => b.id === obs.book_id);
        return {
            ...obs,
            userName: user?.name || 'Unknown User',
            bookName: book?.name || 'Unknown Book',
            projectName: book?.projectName || 'Unknown Project',
            projectId: book?.projectId,
        }
    })
  }, [bookObservations, users, books]);

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
    let filtered = enrichedObservations;
    
    if (selectedProjectId) {
      filtered = filtered.filter(log => log.projectId === selectedProjectId);
    }
    
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
        const s = sorting[0];
        const valA = a[s.id as keyof typeof a];
        const valB = b[s.id as keyof typeof b];
        let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
        if (result !== 0) return s.desc ? -result : result
        return 0
      })
    }
    return filtered
  }, [enrichedObservations, columnFilters, sorting, selectedProjectId])
  
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
        downloadFile(JSON.stringify(data, null, 2), 'observations_history.json', 'application/json');
    } else if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csvContent = [headers.join(','), ...data.map(d => headers.map(h => JSON.stringify(d[h as keyof typeof d])).join(','))].join('\n');
        downloadFile(csvContent, 'observations_history.csv', 'text/csv');
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Observations');
        XLSX.writeFile(workbook, 'observations_history.xlsx');
    }
    toast({ title: "Exportação Concluída", description: `${data.length} observações exportadas.` });
  };

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
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="font-headline flex items-center gap-2"><History className="h-6 w-6"/>Histórico de Observações</CardTitle>
                    <CardDescription>Um registo completo de todas as observações inseridas nos livros.</CardDescription>
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
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('created_at')}>Data {getSortIndicator('created_at')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('bookName')}>Livro {getSortIndicator('bookName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('userName')}>Utilizador {getSortIndicator('userName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('info')}>Estado (Registo) {getSortIndicator('info')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('observation')}>Observação {getSortIndicator('observation')}</div></TableHead>
            </TableRow>
            <TableRow>
                <TableHead><Input placeholder="Filtrar data..." value={columnFilters['created_at'] || ''} onChange={e => setColumnFilters(p => ({...p, created_at: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={e => setColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar livro..." value={columnFilters['bookName'] || ''} onChange={e => setColumnFilters(p => ({...p, bookName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar utilizador..." value={columnFilters['userName'] || ''} onChange={e => setColumnFilters(p => ({...p, userName: e.target.value}))} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['info'] || ''} onChange={e => setColumnFilters(p => ({...p, info: e.target.value}))} className="h-8"/></TableHead>
                <TableHead>
                    <div className="flex items-center justify-between">
                        <Input placeholder="Filtrar observação..." value={columnFilters['observation'] || ''} onChange={e => setColumnFilters(p => ({...p, observation: e.target.value}))} className="h-8"/>
                        <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Limpar Filtros</Button>
                    </div>
                </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {paginatedLogs.map(log => (
                <TableRow key={log.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell>{log.projectName}</TableCell>
                <TableCell className="font-medium">
                    <Link href={`/books/${log.book_id}`} className="hover:underline">{log.bookName}</Link>
                </TableCell>
                <TableCell>{log.userName}</TableCell>
                <TableCell>{log.info}</TableCell>
                <TableCell>
                    {log.observation}
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
                {`A mostrar ${paginatedLogs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} a ${(currentPage - 1) * ITEMS_PER_PAGE + paginatedLogs.length} de ${sortedAndFilteredLogs.length} observações`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>
    </div>
  )
}
