
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppLayoutContent } from './layout-client';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
}
