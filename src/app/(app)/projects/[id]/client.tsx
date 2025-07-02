
"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Book, CheckCircle, Clock, Package, Edit } from "lucide-react";
import { ProjectForm } from "../project-form";
import Link from "next/link";
import { useAppContext } from "@/context/app-context";

interface ProjectDetailClientProps {
  projectId: string;
}

const getStatusIcon = (status: string) => {
    switch(status) {
        case "Complete":
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case "Pending":
            return <Clock className="h-4 w-4 text-muted-foreground" />;
        default:
            return <Package className="h-4 w-4 text-primary" />;
    }
}

export default function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const { projects, clients, updateProject } = useAppContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  
  const project = projects.find(p => p.id === projectId);

  const handleSave = (values: { name: string, clientId: string }) => {
    updateProject(projectId, values);
    setIsEditDialogOpen(false);
  }

  if (!project) {
      return (
          <Card>
              <CardHeader><CardTitle>Project Not Found</CardTitle></CardHeader>
              <CardContent><p>This project could not be found.</p></CardContent>
          </Card>
      )
  }

  return (
    <>
      <div className="space-y-6">
          <div className="flex justify-between items-start">
              <div>
                  <p className="text-sm text-muted-foreground">{project.clientName}</p>
                  <h1 className="font-headline text-3xl font-bold tracking-tight">{project.name}</h1>
              </div>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4"/>
                Edit Project
              </Button>
          </div>

          <Card>
              <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                  <CardDescription>High-level statistics for this project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="text-2xl font-bold">{project.status}</p>
                      </div>
                       <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Documents</p>
                          <p className="text-2xl font-bold">{project.documentCount} / {project.totalExpected}</p>
                      </div>
                       <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground">Books</p>
                          <p className="text-2xl font-bold">{project.books.length}</p>
                      </div>
                  </div>
                   <div>
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Overall Progress</span>
                          <span className="text-sm text-muted-foreground">{Math.round(project.progress)}%</span>
                      </div>
                      <Progress value={project.progress} />
                   </div>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Book className="h-5 w-5" /> Books</CardTitle>
                  <CardDescription>Detailed breakdown of each book within the project.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Book Name</TableHead>
                              <TableHead className="w-[150px]">Status</TableHead>
                              <TableHead className="w-[150px] text-center">Documents</TableHead>
                              <TableHead className="w-[200px]">Progress</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {project.books.map(book => (
                              <TableRow key={book.id}>
                                  <TableCell className="font-medium">
                                      <Link href={`/books/${book.id}`} className="hover:underline">
                                          {book.name}
                                      </Link>
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex items-center gap-2">
                                          {getStatusIcon(book.status)}
                                          <span>{book.status}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">{book.documentCount} / {book.expectedDocuments}</TableCell>
                                  <TableCell>
                                      <Progress value={book.progress} className="h-2" />
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Modify the details of your project.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            project={project}
            clients={clients}
            onSave={handleSave}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
