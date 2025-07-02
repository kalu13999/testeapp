
"use client"

import Link from "next/link";
import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { type Client, type EnrichedProject } from "@/lib/data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ProjectForm } from "./project-form";
import { useAppContext } from "@/context/app-context";

export default function ProjectsClient() {
  const { projects, clients, addProject, updateProject, deleteProject } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'new' | 'edit' | 'delete' | null; data?: EnrichedProject }>({ open: false, type: null })

  const openDialog = (type: 'new' | 'edit' | 'delete', data?: EnrichedProject) => {
    setDialogState({ open: true, type, data })
  }

  const closeDialog = () => {
    setDialogState({ open: false, type: null, data: undefined })
  }

  const handleSave = (values: { name: string; clientId: string }) => {
    if (dialogState.type === 'new') {
      addProject(values);
    } else if (dialogState.type === 'edit' && dialogState.data) {
      updateProject(dialogState.data.id, values);
    }
    closeDialog();
  }

  const handleDelete = () => {
    if (!dialogState.data) return;
    deleteProject(dialogState.data.id);
    closeDialog();
  }


  return (
    <>
      <div className="space-y-6">
          <div className="flex items-center justify-between">
              <div>
                  <h1 className="font-headline text-3xl font-bold tracking-tight">Projects</h1>
                  <p className="text-muted-foreground">Manage and track all ongoing projects.</p>
              </div>
              <Button onClick={() => openDialog('new')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Project
              </Button>
          </div>
          <Card>
              <CardHeader>
                  <CardTitle>All Projects</CardTitle>
                  <CardDescription>An overview of all projects currently in the system.</CardDescription>
              </CardHeader>
              <CardContent>
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                      <TableHead className="w-[150px] text-center">Documents</TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                      <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {projects.map((project) => (
                      <TableRow key={project.id}>
                          <TableCell className="font-medium">
                              <Link href={`/projects/${project.id}`} className="hover:underline">
                                  {project.name}
                              </Link>
                          </TableCell>
                          <TableCell>{project.clientName}</TableCell>
                          <TableCell>
                              <Badge variant={project.status === 'Complete' ? 'default' : 'secondary'}>
                                  {project.status}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-center">{project.documentCount} / {project.totalExpected}</TableCell>
                          <TableCell>
                              <Progress value={project.progress} className="h-2" />
                          </TableCell>
                          <TableCell>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button aria-haspopup="true" size="icon" variant="ghost">
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">Toggle menu</span>
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onSelect={() => openDialog('edit', project)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => openDialog('delete', project)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))}
                  </TableBody>
              </Table>
              </CardContent>
          </Card>
      </div>

      <Dialog open={dialogState.open && (dialogState.type === 'new' || dialogState.type === 'edit')} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogState.type === 'new' ? 'Create New Project' : 'Edit Project'}</DialogTitle>
            <DialogDescription>
              {dialogState.type === 'new' ? 'Add a new project to the system.' : `Editing project: ${dialogState.data?.name}`}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm 
            project={dialogState.data}
            clients={clients}
            onSave={handleSave}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={dialogState.open && dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project <span className="font-bold">{dialogState.data?.name}</span> and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete Project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
