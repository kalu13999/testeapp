"use client";

import {
  Archive,
  ArrowDownToLine,
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
    id: "workflow",
    title: "Workflow",
    items: [
      { href: "/documents", label: "All Documents", icon: Files },
      { href: "/documents", label: "Requests", icon: FileInput, isSubPath: true },
      { href: "/documents", label: "Reception", icon: ArrowDownToLine, isSubPath: true },
      { href: "/documents", label: "Scanning", icon: ScanLine, isSubPath: true },
      { href: "/documents", label: "Storage", icon: Warehouse, isSubPath: true },
      { href: "/documents", label: "Indexing", icon: FileText, isSubPath: true },
      { href: "/documents", label: "Processing", icon: FileJson, isSubPath: true },
      { href: "/documents", label: "Quality Control", icon: FileSearch2, isSubPath: true },
      { href: "/documents", label: "Delivery", icon: Send, isSubPath: true },
    ],
  },
  {
    id: "client",
    title: "Client Portal",
    items: [
      { href: "/dashboard", label: "Client Dashboard", icon: Home, isSubPath: true },
      { href: "/documents", label: "Pending Deliveries", icon: FileClock, isSubPath: true },
      { href: "/documents", label: "Validated History", icon: FileCheck, isSubPath: true },
    ],
  },
  {
    id: "finalization",
    title: "Finalization",
    items: [
      { href: "/documents", label: "Finalized", icon: CheckCheck, isSubPath: true },
      { href: "/documents", label: "Archive", icon: Archive, isSubPath: true },
    ],
  },
];

export function MainNav() {
  const pathname = usePathname();

  const isActive = (href: string, isSubPath?: boolean) => {
    if (isSubPath) {
      // For sub-paths, we don't want to highlight the main /documents link
      return pathname === href;
    }
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  }

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
                        isActive(item.href, item.isSubPath)
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
