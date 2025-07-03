
import React from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { FileLock2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { getEnrichedBooks, getEnrichedDocuments, getUserById, getEnrichedAuditLogs, getClients, getUsers, getEnrichedProjects } from '@/lib/data';
import { AppProvider, useAppContext } from '@/context/workflow-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// New component for the global filter to keep the layout cleaner
const GlobalProjectFilter = () => {
  const { allProjects, selectedProjectId, setSelectedProjectId } = useAppContext();

  return (
    <Select
      value={selectedProjectId || 'all'}
      onValueChange={(value) => setSelectedProjectId(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-full max-w-xs h-9">
        <SelectValue placeholder="Filter all data by project..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Projects</SelectItem>
        {allProjects.map(project => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const AppLayoutContent = ({ children, user }: { children: React.ReactNode, user: any }) => {
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
              <GlobalProjectFilter />
            </div>
            {/* Spacer for mobile view to push UserNav to the right */}
            <div className="flex-1 sm:hidden" /> 
            <div className="flex items-center gap-4">
              <UserNav user={user} />
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  )
}


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetch all initial data on the server
  const [user, clients, users, projects, books, documents, auditLogs] = await Promise.all([
    getUserById('u_admin'),
    getClients(),
    getUsers(),
    getEnrichedProjects(),
    getEnrichedBooks(),
    getEnrichedDocuments(),
    getEnrichedAuditLogs(),
  ]);

  return (
    <SidebarProvider>
      <AppProvider 
        initialClients={clients}
        initialUsers={users}
        initialProjects={projects}
        initialBooks={books} 
        initialDocuments={documents} 
        initialAuditLogs={auditLogs}
      >
        <AppLayoutContent user={user}>
          {children}
        </AppLayoutContent>
      </AppProvider>
    </SidebarProvider>
  );
}
