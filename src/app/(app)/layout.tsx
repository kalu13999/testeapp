
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getEnrichedBooks, getEnrichedDocuments, getUserById, getEnrichedAuditLogs, getClients, getUsers, getEnrichedProjects } from '@/lib/data';
import { AppProvider } from '@/context/workflow-context';
import { AppLayoutContent } from './layout-client';


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
