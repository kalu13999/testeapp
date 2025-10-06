
"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/workflow-context';
import { allMenuItems } from '@/lib/menu-config';
import { MANDATORY_STAGES } from '@/lib/workflow-config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from "@/lib/utils";


export function MainNav() {
  const pathname = usePathname();
  const { currentUser, permissions, selectedProjectId, projectWorkflows } = useAppContext();
  const [openSections, setOpenSections] = React.useState<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('sidebar_collapsible_state');
      if (savedState) {
        setOpenSections(JSON.parse(savedState));
      } else {
        const defaultState: { [key: string]: boolean } = {};
        allMenuItems.forEach(section => {
          if (section.collapsible) {
            defaultState[section.id] = true;
          }
        });
        setOpenSections(defaultState);
      }
    } catch (error) {
      console.error("Failed to parse sidebar state from localStorage", error);
      const defaultState: { [key: string]: boolean } = {};
      allMenuItems.forEach(section => {
        if (section.collapsible) {
          defaultState[section.id] = true;
        }
      });
      setOpenSections(defaultState);
    }
  }, []);

  const handleOpenChange = (sectionId: string, isOpen: boolean) => {
    const newState = { ...openSections, [sectionId]: isOpen };
    setOpenSections(newState);
    try {
      localStorage.setItem('sidebar_collapsible_state', JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save sidebar state to localStorage", error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
        return pathname === href;
    }
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  };
  
  if (!currentUser) {
    return (
       <nav className="flex flex-col p-2">
         <ul className="space-y-4">
            <li>
                <h3 className="px-2 mb-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider font-headline">
                Conta
                </h3>
                <ul className="space-y-1">
                <li>
                    <Link href="/profile" passHref>
                        <Button
                        variant={isActive("/profile") ? "secondary" : "ghost"}
                        className="w-full justify-start font-normal gap-2"
                        >
                        {/* <User className="h-4 w-4 text-muted-foreground" /> */}
                        O Meu Perfil
                        </Button>
                    </Link>
                </li>
                 <li>
                    <Link href="/settings" passHref>
                        <Button
                        variant={isActive("/settings") ? "secondary" : "ghost"}
                        className="w-full justify-start font-normal gap-2"
                        >
                        {/* <Settings className="h-4 w-4 text-muted-foreground" /> */}
                        Configurações
                        </Button>
                    </Link>
                </li>
                </ul>
            </li>
         </ul>
       </nav>
    );
  }

  const userPermissions = permissions[currentUser.role] || [];
  const isAdmin = userPermissions.includes('*');
  const projectWorkflow = (selectedProjectId && projectWorkflows[selectedProjectId]) || Object.values(projectWorkflows)[0] || [];

  const menuItems = allMenuItems.map(menuSection => {
    if (currentUser.role === 'Client' && !['client', 'account', 'dashboard', 'client-workflow', 'client-tools'].includes(menuSection.id)) {
        return null;
    }
    
    const visibleItems = menuSection.items.filter(item => {
      if (item.roles && !item.roles.includes(currentUser.role)) {
        return false;
      }
      
      const hasPermission = isAdmin || userPermissions.some(p => {
        const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
        return regex.test(item.href);
      });

      if (!hasPermission) return false;
      
      if (item.href.startsWith('/workflow/')) {
          const stage = item.href.split('/').pop() || '';
          if (!MANDATORY_STAGES.includes(stage) && !projectWorkflow.includes(stage)) {
            return false;
          }
      }
      
      if (item.href === '/dashboard' && currentUser.role === 'Client' && menuSection.id !== 'dashboard') {
          return false;
      }
       if (item.href === '/admin/overview' && currentUser.role !== 'Admin') {
          return false;
       }


      return true;
    });

    if (visibleItems.length > 0) {
      return { ...menuSection, items: visibleItems };
    }
    
    return null;
  }).filter(Boolean);


  return (
    <nav className="flex flex-col p-2 gap-2">
      <ul className="space-y-4">
        {menuItems.map((menu) => {
          if (!menu) return null;
          
          return (
            <li key={menu.id}>
              {menu.collapsible ? (
                <Collapsible 
                  open={openSections[menu.id] ?? true} 
                  onOpenChange={(isOpen) => handleOpenChange(menu.id, isOpen)}
                  className="group"
                >
                   <CollapsibleTrigger className="flex w-full items-center justify-start px-2 mb-1 cursor-pointer">
                      <h3 className={cn("text-xs font-semibold uppercase tracking-wider font-headline text-muted-foreground",
                        menu.colorVariant === 'client' && 'text-green-600 dark:text-green-500',
                        !menu.colorVariant && 'text-primary'
                      )}>
                        {menu.title}
                      </h3>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-1">
                      {menu.items.map((item) => (
                        <li key={item.label}>
                          <Link href={item.href} passHref>
                            <Button
                              variant={isActive(item.href) ? "secondary" : "ghost"}
                              className="w-full justify-start font-normal gap-2"
                            >
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              {item.label}
                            </Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <>
                  <h3 className="px-2 mb-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider font-headline">
                    {menu.title}
                  </h3>
                  <ul className="space-y-1">
                    {menu.items.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href} passHref>
                          <Button
                            variant={isActive(item.href) ? "secondary" : "ghost"}
                            className="w-full justify-start font-normal gap-2"
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  );
}
