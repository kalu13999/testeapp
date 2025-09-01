
"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StorageConfigTab } from "./storage-config-tab"
import { ProjectStorageAssociationsTab } from "./project-storage-associations-tab"
import { ScannerConfigTab } from "./scanner-config-tab"

export default function GeneralConfigsClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações Gerais</h1>
        <p className="text-muted-foreground">
          Gerir configurações principais do aplicativo, como locais de armazenamento, scanners e suas associações com projetos.
        </p>
      </div>
      <Tabs defaultValue="storages">
        <TabsList>
          <TabsTrigger value="storages">Armazenamento</TabsTrigger>
          <TabsTrigger value="scanners">Scanners</TabsTrigger>
          <TabsTrigger value="project-storages">Associações de Projetos</TabsTrigger>
        </TabsList>
        <TabsContent value="storages" className="pt-4">
          <StorageConfigTab />
        </TabsContent>
         <TabsContent value="scanners" className="pt-4">
          <ScannerConfigTab />
        </TabsContent>
        <TabsContent value="project-storages" className="pt-4">
          <ProjectStorageAssociationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
