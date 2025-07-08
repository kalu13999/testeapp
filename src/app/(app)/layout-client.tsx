
"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { FileLock2 } from 'lucide-react';
import { useAppContext } from '@/context/workflow-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// New component for the global filter to keep the layout cleaner
const GlobalProjectFilter = () => {
  const { accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, currentUser } = useAppContext();

  // If there are no projects to choose from, don't render.
  if (accessibleProjectsForUser.length === 0) {
    return null;
  }

  // If there's only one project AND the user is not an Admin, display statically.
  // Admins should always see the dropdown to select "All Projects" if applicable.
  if (accessibleProjectsForUser.length === 1 && currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center h-9 px-3 text-sm font-medium border rounded-md bg-muted text-muted-foreground">
        {accessibleProjectsForUser[0].name}
      </div>
    )
  }
  
  return (
    <Select
      value={selectedProjectId || 'all-projects'}
      onValueChange={(value) => setSelectedProjectId(value === 'all-projects' ? null : value)}
    >
      <SelectTrigger className="w-full max-w-xs h-9">
        <SelectValue placeholder="Select a project..." />
      </SelectTrigger>
      <SelectContent>
        {currentUser?.role === 'Admin' && (
          <SelectItem value="all-projects">All Projects</SelectItem>
        )}
        {accessibleProjectsForUser.map(project => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, permissions, accessibleProjectsForUser } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    // Route guarding logic
    if (!currentUser) {
      router.push('/');
      return;
    }

    if (accessibleProjectsForUser.length === 0 && !['Admin', 'Client'].includes(currentUser.role)) {
       toast({
        title: 'No Projects Assigned',
        description: 'You are not assigned to any projects. Please contact an administrator.',
        variant: 'destructive',
      });
      // Allow access only to profile page if no projects assigned
      if (pathname !== '/profile') {
        router.push('/profile');
      }
      return;
    }

    const userPermissions = permissions[currentUser.role] || [];
    const isAdmin = userPermissions.includes('*');
    if (isAdmin) return; // Admin can access everything

    // Check if the current path is allowed
    const isAllowed = userPermissions.some(p => {
        const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
        return regex.test(pathname);
    });

    if (!isAllowed) {
        toast({
            title: 'Access Denied',
            description: "You don't have permission to view that page.",
            variant: 'destructive',
        });
        // Redirect to the first allowed page or dashboard
        const firstAllowedPage = userPermissions.find(p => !p.includes('[')) || '/dashboard';
        router.push(firstAllowedPage);
    }
  }, [currentUser, pathname, permissions, router, toast, accessibleProjectsForUser]);

  if (!currentUser) {
    // Render nothing or a loading spinner while redirecting
    return null;
  }
  
  // The filter is only needed if there are any projects to choose from.
  const showProjectFilter = accessibleProjectsForUser.length > 0;

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 p-4">
             <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
               <FileLock2 className="h-6 w-6 text-primary-foreground" />
             </div>
             <h1 className="font-headline text-2xl font-bold text-foreground">FlowVault</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="hidden sm:block">
              {showProjectFilter && <GlobalProjectFilter />}
            </div>
            {/* Spacer for mobile view to push UserNav to the right */}
            <div className="flex-1 sm:hidden" /> 
            <div className="flex items-center gap-4">
              <UserNav user={currentUser} />
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  )
}
