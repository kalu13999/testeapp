
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

export function ClientStatsTab() {
  const { allProjects, clients } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])

  const clientStats = React.useMemo(() => {
    return clients.map(client => {
      const projectsForClient = allProjects.filter(p => p.clientId === client.id)
      const activeProjects = projectsForClient.filter(p => p.status === 'In Progress').length
      const totalBooks = projectsForClient.reduce((sum, p) => sum + p.books.length, 0)
      const finalizedBooks = projectsForClient.reduce((sum, p) => sum + p.books.filter(b => b.status === 'Finalized').length, 0)
      const totalBudget = projectsForClient.reduce((sum, p) => sum + p.budget, 0)
      const avgBudget = projectsForClient.length > 0 ? totalBudget / projectsForClient.length : 0

      return {
        id: client.id,
        name: client.name,
        totalProjects: projectsForClient.length,
        activeProjects,
        totalBooks,
        finalizedBooks,
        avgBudget: avgBudget.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      }
    })
  }, [allProjects, clients])

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

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Client Name {getSortIndicator('name')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalProjects')}>Total Projects {getSortIndicator('totalProjects')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('activeProjects')}>Active Projects {getSortIndicator('activeProjects')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalBooks')}>Total Books {getSortIndicator('totalBooks')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('finalizedBooks')}>Finalized Books {getSortIndicator('finalizedBooks')}</div></TableHead>
            <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer select-none group" onClick={() => handleSort('avgBudget')}>Avg. Project Budget {getSortIndicator('avgBudget')}</div></TableHead>
          </TableRow>
           <TableRow>
            <TableHead><Input placeholder="Filter name..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
            <TableHead colSpan={5}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredClients.map(client => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell className="text-center">{client.totalProjects}</TableCell>
              <TableCell className="text-center">{client.activeProjects}</TableCell>
              <TableCell className="text-center">{client.totalBooks}</TableCell>
              <TableCell className="text-center">{client.finalizedBooks}</TableCell>
              <TableCell className="text-right">{client.avgBudget}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
