
"use client";

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/ui/user-nav';
import { FileLock2, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/workflow-context';
import { useToast } from '@/hooks/use-toast';
import { GlobalProjectFilter } from '@/components/layout/global-project-filter';
import { allMenuItems } from '@/lib/menu-config';
import { RecentPagesNav } from '@/components/layout/recent-pages-nav';
import { GlobalLoader } from '@/components/layout/global-loader';

export const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, permissions, accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, loading, addNavigationHistoryItem } = useAppContext();
  const router = useRouter();
  const { loadInitialData } = useAppContext();
  const pathname = usePathname();
  const isInitialLoad = useRef(true);
  const { toast } = useToast();
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAllowed, setIsAllowed] = React.useState(false);
  const previousUserIdRef = useRef<string | null | undefined>(null);
/*
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false; // Ignorar a primeira execução
      return;
    }
    
    loadInitialData();

  }, [pathname, loadInitialData]);

*/
  useEffect(() => {
    if (loading) {
      setIsChecking(true);
      return;
    }
    // Route guarding logic
    if (!currentUser) {
      router.push('/');
      return;
    }

    if (accessibleProjectsForUser.length === 0 && !['Admin', 'Client'].includes(currentUser.role)) {
       toast({ title: "Nenhum Projeto Selecionado", description: "Por favor, selecione um projeto antes de continuar.", variant: "destructive" });
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
    if (loading || !currentUser || Object.keys(permissions).length === 0) {
        // ainda não carregou os dados, não faz nada
        return;
    }
    // Check if the current path is allowed
    const isPathAllowed = userPermissions.some(p => {
        const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
        return regex.test(pathname);
    });

    if (!isPathAllowed) {
        toast({ title: "Acesso Negado", description: "Não tem permissão para ver essa página.", variant: "destructive" });
        // Redirect to the first allowed page or dashboard
        const firstAllowedPage = userPermissions.find(p => !p.includes('[')) || '/dashboard';
        router.push(firstAllowedPage);
    } else {
        setIsAllowed(true);
    }
    setIsChecking(false);
  }, [currentUser, pathname, permissions, router, toast, accessibleProjectsForUser, loading]);
  
  // Effect to manage the selected project ID automatically
  useEffect(() => {
    if (loading || !currentUser) {
      return;
    }

    const hasUserChanged = previousUserIdRef.current !== null && previousUserIdRef.current !== currentUser.id;
    const isSelectionValid = selectedProjectId && accessibleProjectsForUser.some(p => p.id === selectedProjectId);

    // This is the core logic:
    // 1. If user has changed: Force set to default/first project.
    // 2. If selection is invalid (e.g. no longer accessible): Force set to default/first.
    // 3. If no project is selected: Force set to default/first.
    // Otherwise, do nothing and respect the current selection.
    if (hasUserChanged || !isSelectionValid) {
        let idealProjectId: string | null = null;
        if (currentUser.defaultProjectId && accessibleProjectsForUser.some(p => p.id === currentUser.defaultProjectId)) {
            idealProjectId = currentUser.defaultProjectId;
        } else if (accessibleProjectsForUser.length > 0) {
            idealProjectId = accessibleProjectsForUser[0].id;
        }
        
        if (localStorage.getItem('flowvault_projectid')){
          idealProjectId = localStorage.getItem('flowvault_projectid');
        }

        if(selectedProjectId !== idealProjectId) {
          setSelectedProjectId(idealProjectId);
        }
    }
    
    // Always update the ref AFTER the logic has run
    previousUserIdRef.current = currentUser.id;

  }, [currentUser, accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, loading]);
  
  useEffect(() => {
    if (!pathname || !currentUser) return;
    
    for (const section of allMenuItems) {
        const item = section.items.find(i => {
            if (i.href.includes('[')) {
                const regex = new RegExp(`^${i.href.replace(/\[.*?\]/g, '[^/]+')}$`);
                return regex.test(pathname);
            }
            return i.href === pathname;
        });

        if (item) {
            addNavigationHistoryItem({ href: pathname, label: item.label });
            break; 
        }
    }
  }, [pathname, currentUser, addNavigationHistoryItem]);


  if (loading) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="bg-primary rounded-lg p-3 flex items-center justify-center">
                    <FileLock2 className="h-8 w-8 text-primary-foreground" />
                </div>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading application data...</p>
            </div>
        </div>
    );
  }

  if (!currentUser) {
    // Render nothing or a loading spinner while redirecting
    return null;
  }
  
  return (
    <>
      <Sidebar>
        <SidebarHeader>
           <div className="flex flex-col gap-3 p-3">
             <div className="flex items-center gap-2">
               <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
                 <FileLock2 className="h-6 w-6 text-primary-foreground" />
               </div>
               <h1 className="font-headline text-2xl font-bold text-foreground">RFS<br />WkF Doc</h1>
             </div>
             <GlobalProjectFilter />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="hidden sm:flex flex-1 items-center gap-2">
              <RecentPagesNav />
            </div> 
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
      <GlobalLoader />
    </>
  )
}
