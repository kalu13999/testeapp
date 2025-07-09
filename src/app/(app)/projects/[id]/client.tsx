
"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Book, Edit, DollarSign, Calendar, Info, ArrowUp, ArrowDown, ChevronsUpDown, Settings2, Package, LucideIcon } from "lucide-react";
import { ProjectForm } from "../project-form";
import Link from "next/link";
import { useAppContext } from "@/context/workflow-context";
import { EnrichedBook, Project } from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WORKFLOW_PHASES, MANDATORY_STAGES, STAGE_CONFIG } from "@/lib/workflow-config";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ProjectDetailClientProps {
  projectId: string;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: LucideIcon, label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
      <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Icon className="h-4 w-4" /> {label}</div>
      <div className="font-semibold text-lg">{value}</div>
  </div>
);

export default function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const { allProjects, clients, updateProject, projectWorkflows, updateProjectWorkflow } = useAppContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const project = allProjects.find(p => p.id === projectId);
  const projectWorkflow = projectWorkflows[projectId] || [];

  const handleSave = (values: Omit<Project, 'id'>) => {
    updateProject(projectId, values);
    setIsEditDialogOpen(false);
  }
  
  const handleWorkflowSave = (newWorkflow: string[]) => {
    updateProjectWorkflow(projectId, newWorkflow);
    setIsWorkflowDialogOpen(false);
  }

  const handleSort = (columnId: string, isShift: boolean) => {
    setSorting(currentSorting => {
        const existingSortIndex = currentSorting.findIndex(s => s.id === columnId);
        if (isShift) {
            let newSorting = [...currentSorting];
            if (existingSortIndex > -1) {
                if (newSorting[existingSortIndex].desc) { newSorting.splice(existingSortIndex, 1); } 
                else { newSorting[existingSortIndex].desc = true; }
            } else {
                newSorting.push({ id: columnId, desc: false });
            }
            return newSorting;
        } else {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) { return []; }
                return [{ id: columnId, desc: true }];
            }
            return [{ id: columnId, desc: false }];
        }
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sortIndex = sorting.findIndex(s => s.id === columnId);
    if (sortIndex === -1) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    const sort = sorting[sortIndex];
    const icon = sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
    return <div className="flex items-center gap-1">{icon}{sorting.length > 1 && (<span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>)}</div>;
  }

  const sortedBooks = React.useMemo(() => {
    if (!project) return [];
    let projectBooks = [...project.books];
    if (sorting.length > 0) {
        projectBooks.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
                const valA = a[key as keyof typeof a] ?? '';
                const valB = b[key as keyof typeof b] ?? '';
                let result = 0;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    result = valA - valB;
                } else {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }
                if (result !== 0) return s.desc ? -result : result;
            }
            return 0;
        });
    }
    return projectBooks;
  }, [project, sorting]);

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
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="font-headline text-3xl tracking-tight">{project.name}</CardTitle>
              <CardDescription className="text-base">{project.clientName}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4"/>
                Edit Project
              </Button>
            </div>
          </CardHeader>
          <CardContent>
              <p className="text-muted-foreground max-w-4xl">{project.description}</p>
              <Separator className="my-6" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <DetailItem icon={Package} label="Status" value={<Badge variant={project.status === 'Complete' ? 'default' : 'secondary'}>{project.status}</Badge>} />
                 <DetailItem icon={DollarSign} label="Budget" value={`$${project.budget.toLocaleString()}`} />
                 <DetailItem icon={Calendar} label="Timeline" value={`${project.startDate} to ${project.endDate}`} />
                 <DetailItem icon={Book} label="Pages" value={`${project.documentCount.toLocaleString()} / ${project.totalExpected.toLocaleString()}`} />
              </div>
               <div className="mt-6">
                  <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">{Math.round(project.progress)}%</span>
                  </div>
                  <Progress value={project.progress} />
              </div>
              {project.info && (
                <>
                <Separator className="my-6"/>
                 <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2"><Info className="h-4 w-4"/> Additional Info</h4>
                    <p className="text-sm text-muted-foreground">{project.info}</p>
                </div>
                </>
              )}
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
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>Book Name {getSortIndicator('name')}</div></TableHead>
                            <TableHead className="w-[150px]"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Status {getSortIndicator('status')}</div></TableHead>
                            <TableHead className="w-[150px] text-center"><div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('documentCount', e.shiftKey)}>Documents {getSortIndicator('documentCount')}</div></TableHead>
                            <TableHead className="w-[200px]"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('progress', e.shiftKey)}>Progress {getSortIndicator('progress')}</div></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedBooks.map(book => (
                            <TableRow key={book.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/books/${book.id}`} className="hover:underline">
                                        {book.name}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{book.status}</Badge>
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

        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Workflow Configuration</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsWorkflowDialogOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4"/>
                  Edit Workflow
                </Button>
              </div>
              <CardDescription>
                Customize the sequence of steps for this project. Disabled phases will be skipped, moving books to the next enabled stage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-4">
                  {WORKFLOW_PHASES.map(group => (
                    <div key={group.name}>
                      <h4 className="font-semibold text-sm mb-2">{group.name}</h4>
                      <div className="space-y-2 pl-2 border-l">
                        {group.stages.map(stageKey => {
                            const stageConfig = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG];
                            if (!stageConfig) return null;
                            const isEnabled = projectWorkflow.includes(stageKey);
                            return (
                              <div key={stageKey} className="flex items-center gap-3 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                  <span className={`${!isEnabled && 'text-muted-foreground line-through'}`}>
                                    {stageConfig.title}
                                  </span>
                              </div>
                            )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
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

      <WorkflowConfigDialog 
        open={isWorkflowDialogOpen}
        onOpenChange={setIsWorkflowDialogOpen}
        projectName={project.name}
        currentWorkflow={projectWorkflow}
        onSave={handleWorkflowSave}
      />
    </>
  );
}

// --- Workflow Configuration Dialog Component ---
interface WorkflowConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  currentWorkflow: string[];
  onSave: (newWorkflow: string[]) => void;
}

function WorkflowConfigDialog({ open, onOpenChange, projectName, currentWorkflow, onSave }: WorkflowConfigDialogProps) {
  
  const [enabledPhases, setEnabledPhases] = React.useState<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    if (open) {
      const initialPhases: { [key: string]: boolean } = {};
      WORKFLOW_PHASES.forEach(group => {
        if (group.toggleable) {
          const isEnabled = currentWorkflow.includes(group.stages[0]);
          initialPhases[group.id] = isEnabled;
        }
      });
      setEnabledPhases(initialPhases);
    }
  }, [open, currentWorkflow]);
  
  const handleToggle = (phaseId: string, checked: boolean) => {
    setEnabledPhases(prev => ({
      ...prev,
      [phaseId]: checked,
    }));
  }
  
  const handleSaveChanges = () => {
    let newWorkflow = [...MANDATORY_STAGES];
    
    WORKFLOW_PHASES.forEach(group => {
      if (group.toggleable && enabledPhases[group.id]) {
        newWorkflow.push(...group.stages);
      }
    });

    onSave(newWorkflow);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Workflow for: {projectName}</DialogTitle>
          <DialogDescription>
            Select which optional phases this project will use. Unchecking a phase like "Scanning" or "Indexing" will cause the workflow to bypass those steps. Mandatory steps cannot be disabled.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4 border rounded-md">
          <div className="space-y-6">
            {WORKFLOW_PHASES.map(group => (
              <div key={group.name}>
                <h4 className="font-semibold text-base mb-3 border-b pb-2">{group.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {group.toggleable ? (
                     <div className="flex items-center space-x-3">
                        <Switch
                          id={group.id}
                          checked={enabledPhases[group.id] ?? false}
                          onCheckedChange={(checked) => handleToggle(group.id, checked)}
                        />
                        <Label htmlFor={group.id} className="flex flex-col">
                          <span>Enable {group.name} Phase</span>
                           <span className="text-xs text-muted-foreground">{group.description}</span>
                        </Label>
                      </div>
                  ) : (
                    group.stages.map(stageKey => {
                      const stageConfig = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG];
                      return (
                         <div key={stageKey} className="flex items-center space-x-3 opacity-70">
                            <Switch checked={true} disabled={true} />
                            <Label htmlFor={stageKey} className="flex flex-col">
                              <span>{stageConfig.title}</span>
                              <span className="text-xs text-muted-foreground">Mandatory</span>
                            </Label>
                          </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
