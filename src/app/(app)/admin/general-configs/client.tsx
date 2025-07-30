
"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StorageConfigTab } from "./storage-config-tab"

export default function GeneralConfigsClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">General Configurations</h1>
        <p className="text-muted-foreground">
          Manage core application settings like storage locations and scanners.
        </p>
      </div>
      <Tabs defaultValue="storages">
        <TabsList>
          <TabsTrigger value="storages">Storages</TabsTrigger>
          <TabsTrigger value="scanners" disabled>Scanners (coming soon)</TabsTrigger>
        </TabsList>
        <TabsContent value="storages" className="pt-4">
          <StorageConfigTab />
        </TabsContent>
        <TabsContent value="scanners">
          {/* Scanner configuration component will go here */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
