
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"

const getInitials = (name: string) => {
    if (!name) return ""
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

export function UserStatsTab() {
  const { users, auditLogs } = useAppContext()
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }])

  const userStats = React.useMemo(() => {
    return users.filter(u => u.role !== 'System').map(user => {
      const userLogs = auditLogs.filter(log => log.userId === user.id)
      const scannedCount = userLogs.filter(log => log.action === 'Scanning Finished').length
      const indexedCount = userLogs.filter(log => log.action === 'Assigned for QC').length
      const checkedCount = userLogs.filter(log => log.action === 'Initial QC Complete').length
      
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        totalActions: userLogs.length,
        scannedCount,
        indexedCount,
        checkedCount
      }
    })
  }, [users, auditLogs])

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

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>User {getSortIndicator('name')}</div></TableHead>
            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('role')}>Role {getSortIndicator('role')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('totalActions')}>Total Actions {getSortIndicator('totalActions')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('scannedCount')}>Books Scanned {getSortIndicator('scannedCount')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('indexedCount')}>Books Indexed {getSortIndicator('indexedCount')}</div></TableHead>
            <TableHead className="text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('checkedCount')}>Books Checked {getSortIndicator('checkedCount')}</div></TableHead>
          </TableRow>
           <TableRow>
            <TableHead><Input placeholder="Filter user..." value={columnFilters['name'] || ''} onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} className="h-8"/></TableHead>
            <TableHead><Input placeholder="Filter role..." value={columnFilters['role'] || ''} onChange={e => setColumnFilters(p => ({...p, role: e.target.value}))} className="h-8"/></TableHead>
            <TableHead colSpan={4}><Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button></TableHead>
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
              <TableCell className="text-center">{user.totalActions}</TableCell>
              <TableCell className="text-center">{user.scannedCount}</TableCell>
              <TableCell className="text-center">{user.indexedCount}</TableCell>
              <TableCell className="text-center">{user.checkedCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
