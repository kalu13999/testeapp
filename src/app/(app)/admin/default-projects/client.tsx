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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppContext } from "@/context/workflow-context"
import { type User } from "@/lib/data"

export default function DefaultProjectsClient() {
  const { users, allProjects, updateUserDefaultProject } = useAppContext()

  const getInitials = (name: string) => {
    if (!name) return ""
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Filter out System and Client users as they don't need manual default project assignment
  const displayUsers = users.filter(user => user.role !== 'System' && user.role !== 'Client');

  const getAvailableProjectsForUser = (user: User) => {
    if (user.role === 'Admin') {
      return allProjects;
    }
    if (user.projectIds && user.projectIds.length > 0) {
      const userProjectIds = new Set(user.projectIds);
      return allProjects.filter(p => userProjectIds.has(p.id));
    }
    // Operators with no specific project assignments get access to all
    return allProjects;
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
                <TableHead>User</TableHead>
                <TableHead className="w-[200px]">Role</TableHead>
                <TableHead className="w-[400px]">Default Project</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayUsers.length > 0 ? displayUsers.map((user) => {
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
                  <TableCell colSpan={3} className="h-24 text-center">
                    No applicable users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
