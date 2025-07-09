
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/workflow-context';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function RecentPagesNav() {
  const { navigationHistory } = useAppContext();
  const pathname = usePathname();

  if (!navigationHistory || navigationHistory.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1">
        <span className="text-sm font-semibold text-muted-foreground mr-2">Recent:</span>
        {navigationHistory.map(item => (
            <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                size="sm"
                asChild
            >
                <Link href={item.href}>{item.label}</Link>
            </Button>
        ))}
    </nav>
  );
}
