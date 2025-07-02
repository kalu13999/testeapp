
"use client";

import {
  Archive,
  ArrowDownToLine,
  Briefcase,
  CheckCheck,
  FileCheck,
  FileClock,
  FileInput,
  FileJson,
  FileSearch2,
  FileText,
  Files,
  Home,
  ScanLine,
  Send,
  SlidersHorizontal,
  Warehouse,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

const menuItems = [
  {
    id: "dashboards",
    title: "Dashboards",
    items: [{ href: "/dashboard", label: "Internal", icon: SlidersHorizontal }],
  },
  {
    id: "management",
    title: "Management",
    items: [
      { href: "/projects", label: "Projects", icon: Briefcase },
      { href: "/clients", label: "Clients", icon: Users },
    ],
  },
  {
    id: "workflow",
    title: "Workflow",
    items: [
      { href: "/documents", label: "All Documents", icon: Files },
      { href: "/workflow/requests", label: "Requests", icon: FileInput },
      { href: "/workflow/reception", label: "Reception", icon: ArrowDownToLine },
      { href: "/workflow/scanning", label: "Scanning", icon: ScanLine },
      { href: "/workflow/storage", label: "Storage", icon: Warehouse },
      { href: "/workflow/indexing", label: "Indexing", icon: FileText },
      { href: "/workflow/processing", label: "Processing", icon: FileJson },
      { href: "/workflow/quality-control", label: "Quality Control", icon: FileSearch2 },
      { href: "/workflow/delivery", label: "Delivery", icon: Send },
    ],
  },
  {
    id: "client",
    title: "Client Portal",
    items: [
      { href: "/client-dashboard", label: "Client Dashboard", icon: Home },
      { href: "/pending-deliveries", label: "Pending Deliveries", icon: FileClock },
      { href: "/validated-history", label: "Validated History", icon: FileCheck },
    ],
  },
  {
    id: "finalization",
    title: "Finalization",
    items: [
      { href: "/finalized", label: "Finalized", icon: CheckCheck },
      { href: "/archive", label: "Archive", icon: Archive },
    ],
  },
];

export function MainNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Exact match or sub-path match
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex flex-col p-2">
      <ul className="space-y-4">
        {menuItems.map((menu) => (
          <li key={menu.id}>
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
