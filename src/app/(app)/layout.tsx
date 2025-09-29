
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppLayoutClient from './layout-client';
import { AppProvider } from '@/context/workflow-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <SidebarProvider>
        <AppLayoutClient>
            {children}
        </AppLayoutClient>
      </SidebarProvider>
    </AppProvider>
  );
}
