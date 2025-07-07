
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
  FileJson,
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
  Users2,
  Warehouse,
  Play,
  PlayCircle,
  PencilRuler,
  ClipboardCheck,
  Package,
  GanttChartSquare,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";

const INTERNAL_ROLES = ['Admin', 'Operator', 'QC Specialist', 'Reception', 'Scanning', 'Indexing', 'Processing', 'Delivery'];

const allMenuItems = [
  {
    id: "account",
    title: "Account",
    roles: [...INTERNAL_ROLES, 'Client'],
    items: [
      { href: "/profile", label: "My Profile", icon: User },
    ],
  },
  {
    id: "dashboards",
    title: "Dashboards",
    roles: ['Admin'],
    items: [{ href: "/dashboard", label: "Overview", icon: SlidersHorizontal }],
  },
  {
    id: "management",
    title: "Management",
    roles: ['Admin'],
    items: [
      { href: "/projects", label: "Projects", icon: Briefcase },
      { href: "/clients", label: "Clients", icon: Users2 },
      { href: "/users", label: "Users", icon: User },
      { href: "/book-management", label: "Book Management", icon: BookUp },
      { href: "/role-management", label: "Role Management", icon: GanttChartSquare },
    ],
  },
  {
    id: "workflow",
    title: "Workflow",
    roles: [...INTERNAL_ROLES],
    items: [
      { href: "/documents", label: "All Books", icon: Files },
      { href: "/workflow/pending-shipment", label: "Pending Shipment", icon: FileClock },
      { href: "/workflow/reception", label: "Reception", icon: ArrowDownToLine },
      { href: "/workflow/to-scan", label: "To Scan", icon: ScanLine },
      { href: "/workflow/scanning-started", label: "Scanning Started", icon: PlayCircle },
      { href: "/workflow/storage", label: "Storage", icon: Warehouse },
      { href: "/workflow/to-indexing", label: "To Indexing", icon: FileText },
      { href: "/workflow/indexing-started", label: "Indexing Started", icon: PencilRuler },
      { href: "/workflow/to-checking", label: "To Checking", icon: FileSearch2 },
      { href: "/workflow/checking-started", label: "Checking Started", icon: ClipboardCheck },
      { href: "/workflow/ready-for-processing", label: "Ready for Processing", icon: FileCog },
      { href: "/workflow/in-processing", label: "In Processing", icon: Loader2 },
      { href: "/workflow/processed", label: "Processed", icon: FileCheck2 },
      { href: "/workflow/final-quality-control", label: "Final Quality Control", icon: FileCheck2 },
      { href: "/workflow/delivery", label: "Delivery", icon: Send },
      { href: "/workflow/client-rejections", label: "Client Rejections", icon: ThumbsDown },
      { href: "/workflow/corrected", label: "Corrected", icon: Undo2 },
    ],
  },
  {
    id: "client",
    title: "Client Portal",
    roles: ['Client', 'Admin'],
    items: [
      { href: "/dashboard", label: "Client Dashboard", icon: Home },
      { href: "/shipments", label: "Prepare Shipment", icon: Send },
      { href: "/pending-deliveries", label: "Pending Deliveries", icon: FileClock },
      { href: "/validated-history", label: "Validated History", icon: FileCheck },
    ],
  },
  {
    id: "admin",
    title: "Admin Tools",
    roles: ['Admin'],
    items: [
      { href: "/admin/status-override", label: "Status Override", icon: Sliders },
      { href: "/settings", label: "Settings", icon: Settings },
    ]
  },
  {
    id: "finalization",
    title: "Finalization",
    roles: [...INTERNAL_ROLES],
    items: [
      { href: "/finalized", label: "Finalized", icon: CheckCheck },
      { href: "/archive", label: "Archive", icon: Archive },
    ],
  },
];

export function MainNav() {
  const pathname = usePathname();
  const { currentUser, permissions } = useAppContext();

  const isActive = (href: string) => {
    // Special case for dashboard to avoid it being active for all sub-pages
    if (href === '/dashboard') {
        return pathname === href;
    }
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  };
  
  if (!currentUser) return null; // Don't render nav if no user

  const userPermissions = permissions[currentUser.role] || [];
  const isAdmin = userPermissions.includes('*');

  const menuItems = allMenuItems
    .filter(menu => menu.roles.includes(currentUser.role))
    .map(menu => {
      const filteredItems = menu.items.filter(item => {
          if (isAdmin) return true;
          // A special check for scanning roles to see both pages
          if (item.href.startsWith("/workflow/to-scan") || item.href.startsWith("/workflow/scanning-started")) {
            return userPermissions.includes('/workflow/to-scan');
          }
          return userPermissions.some(p => {
            const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
            return regex.test(item.href);
          });
      });
      if (filteredItems.length > 0) {
          return { ...menu, items: filteredItems };
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
