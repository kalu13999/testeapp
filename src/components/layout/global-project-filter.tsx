"use client";

import { useAppContext } from '@/context/workflow-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const GlobalProjectFilter = () => {
  const { accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, currentUser } = useAppContext();
  
  if (!currentUser) return null;

  // Don't render for clients, as their projects are determined by their client ID.
  if (currentUser.role === 'Client') {
    return null;
  }
  
  // Render a non-interactive display if there's only one or zero projects.
  if (accessibleProjectsForUser.length < 2) {
    return (
      <div className="flex items-center h-9 px-3 text-sm font-medium border rounded-md bg-muted text-muted-foreground truncate">
        {accessibleProjectsForUser[0]?.name || "No Project Assigned"}
      </div>
    )
  }
  
  return (
    <Select
      value={selectedProjectId || ''}
      onValueChange={(value) => setSelectedProjectId(value)}
    >
      <SelectTrigger className="w-full max-w-xs h-9">
        <SelectValue placeholder="Select a project..." />
      </SelectTrigger>
      <SelectContent>
        {accessibleProjectsForUser.map(project => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
