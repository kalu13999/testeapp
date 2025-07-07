
"use client"

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from '@/context/workflow-context';
import { GanttChartSquare } from 'lucide-react';

export default function RoleManagementClient() {
  const { roles, permissions } = useAppContext();

  // Exclude 'System' role from being displayed
  const displayRoles = roles.filter(role => role !== 'System');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          View the permissions and access levels for each user role in the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Roles & Permissions</CardTitle>
          <CardDescription>
            This is a read-only view of the permissions assigned to each role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {displayRoles.map(role => {
              const rolePermissions = permissions[role] || [];
              const isAllPermissions = rolePermissions.includes('*');

              return (
                <AccordionItem value={role} key={role}>
                  <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                    <div className="flex items-center gap-3">
                      <GanttChartSquare className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-base">{role}</p>
                        <p className="text-sm text-muted-foreground text-left">
                          {isAllPermissions 
                            ? "Full system access" 
                            : `${rolePermissions.length} permissions granted`}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4">
                    <div className="border rounded-md p-4 bg-muted/30">
                      <h4 className="font-semibold mb-2">Allowed Page Routes:</h4>
                      {isAllPermissions ? (
                        <Badge>All Permissions (*)</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {rolePermissions.length > 0 ? (
                            rolePermissions.map(permission => (
                              <Badge variant="secondary" key={permission} className="font-mono text-xs">
                                {permission}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No specific permissions assigned.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
