
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppContext } from "@/context/workflow-context"
import { type User } from "@/lib/data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

const ITEMS_PER_PAGE = 10;

export default function DefaultProjectsClient() {
  const { users, allProjects, updateUserDefaultProject } = useAppContext()

  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'name', desc: false }]);
  const [currentPage, setCurrentPage] = React.useState(1);

  const getInitials = (name: string) => {
    if (!name) return ""
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const displayUsers = users.filter(user => user.role !== 'System' && user.clientId === null);

  const getAvailableProjectsForUser = (user: User) => {
    if (user.role === 'Admin') {
      return allProjects;
    }
    if (user.projectIds && user.projectIds.length > 0) {
      const userProjectIds = new Set(user.projectIds);
      return allProjects.filter(p => userProjectIds.has(p.id));
    }
    return allProjects;
  }
  
  const handleSort = (columnId: string) => {
    setSorting(currentSorting => {
      if (currentSorting.length > 0 && currentSorting[0].id === columnId) {
        return [{ id: columnId, desc: !currentSorting[0].desc }];
      }
      return [{ id: columnId, desc: false }];
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
  };

  const sortedAndFilteredUsers = React.useMemo(() => {
    let filtered = [...displayUsers];
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(item => {
          const itemValue = item[columnId as keyof User];
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered.sort((a, b) => {
        const s = sorting[0];
        const valA = a[s.id as keyof User];
        const valB = b[s.id as keyof User];
        let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return s.desc ? -result : result;
      });
    }

    return filtered;
  }, [displayUsers, columnFilters, sorting]);

  const totalPages = Math.ceil(sortedAndFilteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = sortedAndFilteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          <PaginationItem><PaginationLink href="#">Page {currentPage} of {totalPages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Default Project Management</h1>
        <p className="text-muted-foreground">
          Assign a default project for each user to see upon login.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Defaults</CardTitle>
          <CardDescription>
            Select a project from the dropdown to set it as the user's default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>
                        User {getSortIndicator('name')}
                    </div>
                </TableHead>
                <TableHead className="w-[200px]">
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('username')}>
                        Username {getSortIndicator('username')}
                    </div>
                </TableHead>
                <TableHead className="w-[200px]">
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('role')}>
                        Role {getSortIndicator('role')}
                    </div>
                </TableHead>
                <TableHead className="w-[400px]">Default Project</TableHead>
              </TableRow>
               <TableRow>
                <TableHead>
                    <Input 
                        placeholder="Filter by name..." 
                        value={columnFilters['name'] || ''} 
                        onChange={e => setColumnFilters(p => ({...p, name: e.target.value}))} 
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input 
                        placeholder="Filter by username..." 
                        value={columnFilters['username'] || ''} 
                        onChange={e => setColumnFilters(p => ({...p, username: e.target.value}))} 
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Input 
                        placeholder="Filter by role..." 
                        value={columnFilters['role'] || ''} 
                        onChange={e => setColumnFilters(p => ({...p, role: e.target.value}))} 
                        className="h-8"
                    />
                </TableHead>
                <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>Clear Filters</Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? paginatedUsers.map((user) => {
                const availableProjects = getAvailableProjectsForUser(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {user.avatar && <AvatarImage src={user.avatar} alt="User avatar" data-ai-hint="person avatar"/>}
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Select
                        value={user.defaultProjectId || ""}
                        onValueChange={(projectId) => updateUserDefaultProject(user.id, projectId)}
                        disabled={availableProjects.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a default project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProjects.length > 0 ? (
                            availableProjects.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No projects assigned</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No applicable users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {`Showing ${paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedUsers.length} of ${sortedAndFilteredUsers.length} users`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>
    </div>
  )
}
