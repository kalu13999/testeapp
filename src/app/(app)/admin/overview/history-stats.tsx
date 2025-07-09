"use client"

import * as React from "react"
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
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import Link from "next/link"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

const ITEMS_PER_PAGE = 20;

export function HistoryStatsTab() {
  const { auditLogs } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'date', desc: true }])
  const [currentPage, setCurrentPage] = React.useState(1);

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
    <div className="space-y-4">
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
      <div className="flex items-center justify-between pt-2">
         <div className="text-xs text-muted-foreground">
            {`Showing ${paginatedLogs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to ${(currentPage - 1) * ITEMS_PER_PAGE + paginatedLogs.length} of ${sortedAndFilteredLogs.length} log entries`}
        </div>
        <PaginationNav />
      </div>
    </div>
  )
}
