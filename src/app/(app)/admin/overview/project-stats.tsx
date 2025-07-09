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
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import Link from "next/link"
import type { EnrichedProject } from "@/context/workflow-context"
import { format } from "date-fns"

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'On Hold': return 'outline';
        default: return 'outline';
    }
}

export function ProjectStatsTab() {
  const { allProjects, documents } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])

  const projectStats = React.useMemo(() => {
    return allProjects.map(project => {
      const errorDocs = new Set(documents.filter(d => d.projectId === project.id && d.flag === 'error').map(d => d.bookId));
      const finalizedBooks = project.books.filter(b => b.status === 'Finalized').length;
      return {
        ...project,
        errorBooksCount: errorDocs.size,
        finalizedBooksCount: finalizedBooks,
        timeline: `${format(new Date(project.startDate), "LLL d, y")} to ${format(new Date(project.endDate), "LLL d, y")}`,
      }
    })
  }, [allProjects, documents])

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

  const sortedAndFilteredProjects = React.useMemo(() => {
    let filtered = projectStats;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(project => {
          const projectValue = project[columnId as keyof typeof project]
          return String(projectValue).toLowerCase().includes(value.toLowerCase())
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
  }, [projectStats, columnFilters, sorting])

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Project Name {getSortIndicator('name')}</div></TableHead>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('clientName')}>Client {getSortIndicator('clientName')}</div></TableHead>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('status')}>Status {getSortIndicator('status')}</div></TableHead>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('timeline')}>Timeline {getSortIndicator('timeline')}</div></TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalExpected')}>Total Pages {getSortIndicator('totalExpected')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('finalizedBooksCount')}>Finalized Books {getSortIndicator('finalizedBooksCount')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('errorBooksCount')}>Books with Errors {getSortIndicator('errorBooksCount')}</div></TableHead>
          </TableRow>
          <TableRow>
            <TableHead><Input placeholder="Filter name..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
            <TableHead><Input placeholder="Filter client..." value={columnFilters['clientName'] || ''} onChange={e => setColumnFilters(p => ({...p, clientName: e.target.value}))} className="h-8"/></TableHead>
            <TableHead><Input placeholder="Filter status..." value={columnFilters['status'] || ''} onChange={e => setColumnFilters(p => ({...p, status: e.target.value}))} className="h-8"/></TableHead>
            <TableHead><Input placeholder="Filter timeline..." value={columnFilters['timeline'] || ''} onChange={e => setColumnFilters(p => ({...p, timeline: e.target.value}))} className="h-8"/></TableHead>
            <TableHead colSpan={4}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredProjects.map(project => (
            <TableRow key={project.id}>
              <TableCell className="font-medium"><Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link></TableCell>
              <TableCell>{project.clientName}</TableCell>
              <TableCell><Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge></TableCell>
              <TableCell>{project.timeline}</TableCell>
              <TableCell><Progress value={project.progress} className="h-2"/></TableCell>
              <TableCell className="text-center">{project.documentCount} / {project.totalExpected}</TableCell>
              <TableCell className="text-center">{project.finalizedBooksCount}</TableCell>
              <TableCell className="text-center">{project.errorBooksCount > 0 ? <span className="text-destructive font-bold">{project.errorBooksCount}</span> : '0'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
