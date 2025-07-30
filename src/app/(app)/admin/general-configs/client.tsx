
"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StorageConfigTab } from "./storage-config-tab"
import { ProjectStorageAssociationsTab } from "./project-storage-associations-tab"

export default function GeneralConfigsClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">General Configurations</h1>
        <p className="text-muted-foreground">
          Manage core application settings like storage locations, scanners, and their associations with projects.
        </p>
      </div>
      <Tabs defaultValue="storages">
        <TabsList>
          <TabsTrigger value="storages">Storages</TabsTrigger>
          <TabsTrigger value="project-storages">Project-Storage</TabsTrigger>
          <TabsTrigger value="scanners" disabled>Scanners (coming soon)</TabsTrigger>
        </TabsList>
        <TabsContent value="storages" className="pt-4">
          <StorageConfigTab />
        </TabsContent>
        <TabsContent value="project-storages" className="pt-4">
          <ProjectStorageAssociationsTab />
        </TabsContent>
        <TabsContent value="scanners">
          {/* Scanner configuration component will go here */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
