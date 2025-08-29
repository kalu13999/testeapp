
"use client";

import { useAppContext } from '@/context/workflow-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const GlobalProjectFilter = () => {
  const { accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, currentUser } = useAppContext();
  
  // This component is now available for Admins, Operators, and Clients.
  // It is hidden only if there are no projects to show.
  if (!currentUser || accessibleProjectsForUser.length < 1) {
    return (
      <div className="flex items-center h-9 px-3 w-full text-sm font-medium border rounded-md bg-muted text-muted-foreground truncate">
        No Projects Available
      </div>
    )
  }
  
  return (
    <Select
      value={selectedProjectId || ''}
      onValueChange={(value) => {setSelectedProjectId(value); localStorage.setItem('flowvault_projectid', value);}}
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
