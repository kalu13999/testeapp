
"use client";

import {
  Archive,
  ArrowDownToLine,
  BookUp,
  Briefcase,
  CheckCheck,
  ClipboardList,
  FileCheck,
  FileCheck2,
  FileClock,
  FileCog,
  FileSearch2,
  FileText,
  Files,
  Home,
  History,
  Loader2,
  ScanLine,
  Send,
  Sliders,
  SlidersHorizontal,
  ThumbsDown,
  Undo2,
  Warehouse,
  PlayCircle,
  PencilRuler,
  ClipboardCheck,
  GanttChartSquare,
  Settings,
  Tags,
  User,
  Users,
  UserCog,
  Star,
  Globe,
  LucideIcon,
  ChevronRight,
  MonitorCheck,
  Split,
  ServerCog,
  TrendingUp,
  Workflow,
  Wrench,
  Building,
  Truck,
  ClipboardSignature
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/workflow-context";
import { allMenuItems } from "@/lib/menu-config";
import { MANDATORY_STAGES } from "@/lib/workflow-config";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React from "react";
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
        // Default to all collapsible sections being open on first visit
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
      // Fallback to default if parsing fails
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
    // Special case for dashboard to avoid it being active for all sub-pages
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
                        <User className="h-4 w-4 text-muted-foreground" />
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
                        <Settings className="h-4 w-4 text-muted-foreground" />
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
    // For clients, only show the Client Portal and Account sections
    if (currentUser.role === 'Client' && !['client', 'account', 'dashboard', 'client-workflow', 'client-tools'].includes(menuSection.id)) {
        return null;
    }
    
    // For other users, filter based on permissions
    const visibleItems = menuSection.items.filter(item => {
      // 1. Role-based filter (for specific UIs like client/admin dashboard)
      if (item.roles && !item.roles.includes(currentUser.role)) {
        return false;
      }
      
      // 2. Permission-based filter
      const hasPermission = isAdmin || userPermissions.some(p => {
        const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
        return regex.test(item.href);
      });

      if (!hasPermission) return false;
      
      // 3. Project Workflow filter
      if (item.href.startsWith('/workflow/')) {
          const stage = item.href.split('/').pop() || '';
          if (!MANDATORY_STAGES.includes(stage) && !projectWorkflow.includes(stage)) {
            return false;
          }
      }
      
      // Special case for client dashboard link
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
          const SectionIcon = menu.icon;
          
          return (
            <li key={menu.id}>
              {menu.collapsible ? (
                <Collapsible 
                  open={openSections[menu.id] ?? true} 
                  onOpenChange={(isOpen) => handleOpenChange(menu.id, isOpen)}
                  className="group"
                >
                   <CollapsibleTrigger className="flex w-full items-center justify-between px-2 mb-1 cursor-pointer">
                      <h3 className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-headline",
                        menu.colorVariant === 'neutral' && 'text-muted-foreground',
                        menu.colorVariant === 'client' && 'text-green-600 dark:text-green-500',
                        !menu.colorVariant && 'text-primary'
                      )}>
                        {SectionIcon && <SectionIcon className="h-4 w-4" />}
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
