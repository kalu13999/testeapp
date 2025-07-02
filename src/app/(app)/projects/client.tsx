
"use client"

import Link from "next/link";
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
import { PlusCircle } from "lucide-react";

type Project = {
    id: string;
    name: string;
    clientName: string;
    status: string;
    progress: number;
    documentCount: number;
    totalExpected: number;
};

interface ProjectsClientProps {
  projects: Project[];
}

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Projects</h1>
                <p className="text-muted-foreground">Manage and track all ongoing projects.</p>
            </div>
            <Button>
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
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    </div>
  )
}
