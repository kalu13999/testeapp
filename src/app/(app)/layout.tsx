
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppLayoutContent } from './layout-client';
import { ClientValidationProvider } from '@/context/workflow-cliente-context';
import { AppProvider } from '@/context/workflow-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <SidebarProvider>
        <AppLayoutContent>
          <ClientValidationProvider>
            {children}
          </ClientValidationProvider>
        </AppLayoutContent>
      </SidebarProvider>
    </AppProvider>
  );
}
