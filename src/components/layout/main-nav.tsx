
"use client";

import {
  Archive,
  ArrowDownToLine,
  BookUp,
  Briefcase,
  CheckCheck,
  FileCheck,
  FileCheck2,
  FileClock,
  FileCog,
  FileSearch2,
  FileText,
  Files,
  Home,
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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/workflow-context";
import { MANDATORY_STAGES } from "@/lib/workflow-config";

const allMenuItems = [
  {
    id: "account",
    title: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: User },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    id: "dashboards",
    title: "Dashboards",
    items: [
        { href: "/dashboard", label: "Project Dashboard", icon: SlidersHorizontal },
        { href: "/admin/overview", label: "Global Overview", icon: Globe, roles: ['Admin'] },
    ],
  },
  {
    id: "management",
    title: "Management",
    items: [
      { href: "/projects", label: "Projects", icon: Briefcase },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/book-management", label: "Book Management", icon: BookUp },
    ],
  },
  {
    id: "admin",
    title: "Admin Tools",
    items: [
      { href: "/role-management", label: "Role Management", icon: GanttChartSquare },
      { href: "/users", label: "Users", icon: User },
      { href: "/admin/status-override", label: "Status Override", icon: Sliders },
    ]
  },
  {
    id: "workflow-tools",
    title: "Workflow Tools",
    items: [
      { href: "/documents", label: "All Books", icon: Files },
      { href: "/admin/reassign-user", label: "Reassign User", icon: UserCog },
      { href: "/admin/default-projects", label: "Default Projects", icon: Star },
    ]
  },
  {
    id: "workflow-intake",
    title: "Intake & Reception",
    items: [
      { href: "/workflow/pending-shipment", label: "Pending Shipment", icon: FileClock },
      { href: "/workflow/confirm-reception", label: "Confirm Reception", icon: ArrowDownToLine },
      { href: "/workflow/already-received", label: "Already Received", icon: CheckCheck },
    ]
  },
  {
    id: "workflow-scanning",
    title: "Scanning",
    items: [
      { href: "/workflow/to-scan", label: "To Scan", icon: ScanLine },
      { href: "/workflow/scanning-started", label: "Scanning Started", icon: PlayCircle },
    ]
  },
  {
    id: "workflow-digitization",
    title: "Digitization",
    items: [
      { href: "/workflow/storage", label: "Storage", icon: Warehouse },
      { href: "/workflow/to-indexing", label: "To Indexing", icon: FileText },
      { href: "/workflow/indexing-started", label: "Indexing Started", icon: PencilRuler },
    ]
  },
  {
    id: "workflow-qc",
    title: "Quality Control",
    items: [
      { href: "/workflow/to-checking", label: "To Checking", icon: FileSearch2 },
      { href: "/workflow/checking-started", label: "Checking Started", icon: ClipboardCheck },
      { href: "/workflow/final-quality-control", label: "Final Quality Control", icon: FileCheck2 },
    ]
  },
  {
    id: "workflow-processing",
    title: "Processing",
    items: [
      { href: "/workflow/ready-for-processing", label: "Ready for Processing", icon: FileCog },
      { href: "/workflow/in-processing", label: "In Processing", icon: Loader2 },
      { href: "/workflow/processed", label: "Processed", icon: FileCheck2 },
    ]
  },
  {
    id: "workflow-delivery",
    title: "Delivery & Correction",
    items: [
      { href: "/workflow/delivery", label: "Delivery", icon: Send },
      { href: "/workflow/client-rejections", label: "Client Rejections", icon: ThumbsDown },
      { href: "/workflow/corrected", label: "Corrected", icon: Undo2 },
    ]
  },
  {
    id: "finalization",
    title: "Finalization",
    items: [
      { href: "/finalized", label: "Finalized", icon: CheckCheck },
      { href: "/archive", label: "Archive", icon: Archive },
    ],
  },
  {
    id: "client",
    title: "Client Portal",
    items: [
      { href: "/dashboard", label: "Project Dashboard", icon: Home, roles: ['Client'] },
      { href: "/shipments", label: "Prepare Shipment", icon: Send },
      { href: "/pending-deliveries", label: "Pending Deliveries", icon: FileClock },
      { href: "/validated-history", label: "Validated History", icon: FileCheck },
      { href: "/reasons", label: "Rejection Reasons", icon: Tags },
    ],
  },
];

export function MainNav() {
  const pathname = usePathname();
  const { currentUser, permissions, selectedProjectId, projectWorkflows, getNextEnabledStage } = useAppContext();

  const isActive = (href: string) => {
    // Special case for dashboard to avoid it being active for all sub-pages
    if (href === '/dashboard') {
        return pathname === href;
    }
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  };
  
  if (!currentUser || !selectedProjectId) {
    return (
       <nav className="flex flex-col p-2">
         <ul className="space-y-4">
            <li>
                <h3 className="px-2 mb-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider font-headline">
                Account
                </h3>
                <ul className="space-y-1">
                <li>
                    <Link href="/profile" passHref>
                        <Button
                        variant={isActive("/profile") ? "secondary" : "ghost"}
                        className="w-full justify-start font-normal gap-2"
                        >
                        <User className="h-4 w-4 text-muted-foreground" />
                        My Profile
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
                        Settings
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
    if (currentUser.role === 'Client' && !['client', 'account'].includes(menuSection.id)) {
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
      if (item.href === '/dashboard' && currentUser.role !== 'Client' && menuSection.id === 'client') {
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
    <nav className="flex flex-col p-2">
      <ul className="space-y-4">
        {menuItems.map((menu) => (
          menu && <li key={menu.id}>
            <h3 className="px-2 mb-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider font-headline">
              {menu.title}
            </h3>
            <ul className="space-y-1">
              {menu.items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} passHref>
                    <Button
                      variant={
                        isActive(item.href)
                          ? "secondary"
                          : "ghost"
                      }
                      className="w-full justify-start font-normal gap-2"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
