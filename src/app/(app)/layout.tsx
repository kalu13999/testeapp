import React from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { FileLock2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:justify-end md:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="flex items-center gap-4">
              <UserNav />
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
