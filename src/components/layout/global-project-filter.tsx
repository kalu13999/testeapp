
"use client";

import { useAppContext } from '@/context/workflow-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const GlobalProjectFilter = () => {
  const { accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, currentUser } = useAppContext();
  
  if (!currentUser || currentUser.role === 'Client') {
    return null;
  }
  
  if (accessibleProjectsForUser.length < 1) {
    return (
      <div className="flex items-center h-9 px-3 w-full text-sm font-medium border rounded-md bg-muted text-muted-foreground truncate">
        No Project Assigned
      </div>
    )
  }
  
  return (
    <Select
      value={selectedProjectId || ''}
      onValueChange={(value) => setSelectedProjectId(value)}
    >
      <SelectTrigger className="w-full h-9">
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
