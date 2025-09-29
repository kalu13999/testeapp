

"use client";

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/ui/user-nav';
import { FileLock2, Loader2, Workflow } from 'lucide-react';
import { useAppContext } from '@/context/workflow-context';
import { useToast } from '@/hooks/use-toast';
import { GlobalProjectFilter } from '@/components/layout/global-project-filter';
import { allMenuItems } from '@/lib/menu-config';
import { RecentPagesNav } from '@/components/layout/recent-pages-nav';
import { GlobalLoader } from '@/components/layout/global-loader';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MANDATORY_STAGES } from '@/lib/workflow-config';

const InvalidWorkflowPage = () => (
  <Card className="m-auto mt-10 max-w-lg text-center">
    <CardHeader>
      <div className="mx-auto bg-muted rounded-full p-3 w-fit">
        <Workflow className="h-10 w-10 text-muted-foreground" />
      </div>
      <CardTitle className="mt-4">Etapa de Workflow Inválida</CardTitle>
      <CardDescription>
        A página atual não faz parte do fluxo de trabalho ativo para o projeto selecionado.
        Por favor, selecione um projeto diferente ou navegue para outra página.
      </CardDescription>
    </CardHeader>
  </Card>
);


export const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { isMutating, currentUser, permissions, accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, loadingPage, isPageLoading, addNavigationHistoryItem, loadInitialData, projectWorkflows } = useAppContext();
  const router = useRouter();
  const isInitialLoad = useRef(true);
  const { toast } = useToast();
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAllowed, setIsAllowed] = React.useState(false);
  const [isWorkflowPageValid, setIsWorkflowPageValid] = React.useState(true);
  const previousUserIdRef = useRef<string | null | undefined>(null);
  const pathname = usePathname();
  
  const refreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

 useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadInitialData(false); // Explicit full load on first mount
      return;
    }
  
    if (pathname) {
      // quando muda de página, limpa intervalo anterior e força refresh
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
  
      loadInitialData(true); // Silent refresh on navigation
    }
  }, [pathname, loadInitialData]);
  
  useEffect(() => {
    if (isMutating || loadingPage || isPageLoading) return;
  
    // cria intervalo e guarda no ref
    refreshIntervalRef.current = setInterval(() => {
      if (!isMutating && !loadingPage && !isPageLoading) {
        loadInitialData(true); // silent refresh
      }
    }, 60000); // 60s ou 600000 para 10min
  
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isMutating, loadingPage, isPageLoading, loadInitialData]);


  useEffect(() => {
    // Show loader while initial user/permission check is happening
    if (isPageLoading || loadingPage) {
      setIsChecking(true);
      return;
    }

    if (!isChecking) {
      if (!currentUser) {
        router.push('/');
        return;
      }
    }
    
    // Wait for currentUser to be available before proceeding
    if (!currentUser) {
      setIsChecking(true); // Still checking if no user yet
      return;
    }

    // Wait for permissions to be loaded before checking.
    if (Object.keys(permissions).length === 0) {
      setIsChecking(true); // Continue to show loader while permissions load
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


    const isPathAllowed = userPermissions.some(p => {
      // Create a regex from the permission string.
      // This allows for dynamic paths like /projects/[id]
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
  }, [currentUser, pathname, permissions, router, toast, accessibleProjectsForUser, isPageLoading, isChecking, loadingPage]);
  
  // Effect to manage the selected project ID automatically
  useEffect(() => {
    if (isPageLoading || !currentUser || accessibleProjectsForUser.length === 0) return;

    const isNewUser = previousUserIdRef.current !== currentUser.id;
    const isSelectionInvalid = !selectedProjectId || !accessibleProjectsForUser.some(p => p.id === selectedProjectId);

    if (isNewUser || isSelectionInvalid) {
        let idealProjectId: string | null = null;
        const storedProjectId = localStorage.getItem('flowvault_projectid');
        
        if (storedProjectId && accessibleProjectsForUser.some(p => p.id === storedProjectId)) {
            idealProjectId = storedProjectId;
        } else if (currentUser.defaultProjectId && accessibleProjectsForUser.some(p => p.id === currentUser.defaultProjectId)) {
            idealProjectId = currentUser.defaultProjectId;
        } else {
            idealProjectId = accessibleProjectsForUser[0].id;
        }
        
        if (idealProjectId && idealProjectId !== selectedProjectId) {
            setSelectedProjectId(idealProjectId);
        }
    }
    
    previousUserIdRef.current = currentUser.id;

}, [currentUser, accessibleProjectsForUser, selectedProjectId, setSelectedProjectId, isPageLoading]);

  
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
  
  // Effect to validate if the current workflow page is valid for the selected project
  useEffect(() => {
    if (pathname.startsWith('/workflow/') && selectedProjectId && Object.keys(projectWorkflows).length > 0) {
      const stage = pathname.split('/')[2];
      const projectWorkflow = projectWorkflows[selectedProjectId] || [];
      const isStageInWorkflow = projectWorkflow.includes(stage) || MANDATORY_STAGES.includes(stage);
      setIsWorkflowPageValid(isStageInWorkflow);
    } else {
      setIsWorkflowPageValid(true); // Not a workflow page or no project selected, so it's valid
    }
  }, [pathname, selectedProjectId, projectWorkflows]);


  if (!currentUser && !isPageLoading && !loadingPage) {
    // This will show while the app is trying to restore the user from localStorage
    // Or if the user is genuinely not logged in
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="bg-primary rounded-lg p-3 flex items-center justify-center">
                    <FileLock2 className="h-8 w-8 text-primary-foreground" />
                </div>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading user session...</p>
            </div>
        </div>
    );
  }
  
  if (isPageLoading || loadingPage) {
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
            isAllowed ? (isWorkflowPageValid ? children : <InvalidWorkflowPage />) : null
          )}
        </main>
      </SidebarInset>
      <GlobalLoader />
    </>
  )
}
