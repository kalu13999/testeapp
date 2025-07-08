
"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { FileLock2, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/workflow-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// New component for the global filter to keep the layout cleaner
const GlobalProjectFilter = () => {
  const { accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, currentUser } = useAppContext();
  
  // Render nothing if there are no projects to choose from.
  if (accessibleProjectsForUser.length < 2) {
    return (
      <div className="flex items-center h-9 px-3 text-sm font-medium border rounded-md bg-muted text-muted-foreground">
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

export const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, permissions, accessibleProjectsForUser, selectedProjectId, setSelectedProjectId } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAllowed, setIsAllowed] = React.useState(false);

  useEffect(() => {
    setIsChecking(true);
    setIsAllowed(false);
  }, [pathname]);

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
      } else {
        setIsAllowed(true);
      }
      setIsChecking(false);
      return;
    }

    const userPermissions = permissions[currentUser.role] || [];
    const isAdmin = userPermissions.includes('*');
    if (isAdmin) {
      setIsAllowed(true);
      setIsChecking(false);
      return; // Admin can access everything
    }

    // Check if the current path is allowed
    const isPathAllowed = userPermissions.some(p => {
        const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
        return regex.test(pathname);
    });

    if (!isPathAllowed) {
        toast({
            title: 'Access Denied',
            description: "You don't have permission to view that page.",
            variant: 'destructive',
        });
        // Redirect to the first allowed page or dashboard
        const firstAllowedPage = userPermissions.find(p => !p.includes('[')) || '/dashboard';
        router.push(firstAllowedPage);
    } else {
        setIsAllowed(true);
    }
    setIsChecking(false);
  }, [currentUser, pathname, permissions, router, toast, accessibleProjectsForUser]);
  
   // Effect to manage the selected project ID automatically
  useEffect(() => {
    if (!currentUser) {
        if (selectedProjectId !== null) {
            setSelectedProjectId(null);
        }
        return;
    }

    const isSelectionValid = accessibleProjectsForUser.some(p => p.id === selectedProjectId);

    if (isSelectionValid) {
        return;
    }

    let newDefaultProjectId: string | null = null;
    if (currentUser.defaultProjectId && accessibleProjectsForUser.some(p => p.id === currentUser.defaultProjectId)) {
        newDefaultProjectId = currentUser.defaultProjectId;
    } else if (accessibleProjectsForUser.length > 0) {
        newDefaultProjectId = accessibleProjectsForUser[0].id;
    }

    setSelectedProjectId(newDefaultProjectId);

  }, [currentUser, accessibleProjectsForUser, selectedProjectId, setSelectedProjectId]);

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
          {isChecking ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            isAllowed ? children : null
          )}
        </main>
      </SidebarInset>
    </>
  )
}
