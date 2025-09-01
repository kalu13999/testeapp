
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import React from "react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Scanner } from "@/lib/data"

const formSchema = z.object({
  nome: z.string().min(2, "Name must be at least 2 characters."),
  ip: z.string().min(1, "IP Address is required."),
  scanner_root_folder: z.string().min(1, "Scanner root folder is required."),
  error_folder: z.string().min(1, "Error folder path is required."),
  success_folder: z.string().min(1, "Success folder path is required."),
  local_thumbs_path: z.string().min(1, "Local thumbnails path is required."),
  status: z.enum(["ativo", "inativo", "manutencao"]),
})

export type ScannerFormValues = z.infer<typeof formSchema>

interface ScannerFormProps {
  scanner?: Partial<Scanner> | null
  onSave: (values: ScannerFormValues) => void
  onCancel: () => void
}

export function ScannerForm({ scanner, onSave, onCancel }: ScannerFormProps) {
  const form = useForm<ScannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: scanner?.nome || "",
      ip: scanner?.ip || "",
      scanner_root_folder: scanner?.scanner_root_folder || "",
      error_folder: scanner?.error_folder || "",
      success_folder: scanner?.success_folder || "",
      local_thumbs_path: scanner?.local_thumbs_path || "",
      status: scanner?.status || "ativo",
    },
  })

  const onSubmit = (values: ScannerFormValues) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Scanner</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: SCAMAX-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço IP</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: 192.168.1.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="scanner_root_folder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localização Raiz</FormLabel>
              <FormControl>
                <Input placeholder="ex.: \\192.168.1.50\e$\DIGITALIZAR\0-PRONTO" {...field} />
              </FormControl>
              <FormDescription>A pasta principal monitorada pelo trabalhador.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="success_folder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização de Sucessos</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: \\192.168.1.50\e$\DIGITALIZAR\_CONCLUIDOS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="error_folder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização de Erros</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: \\192.168.1.50\e$\DIGITALIZAR\_ERROS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
         <FormField
            control={form.control}
            name="local_thumbs_path"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Localização de Thumbnails</FormLabel>
                <FormControl>
                <Input placeholder="ex.: \Temp\Thumbs" {...field} />
                </FormControl>
                <FormDescription>Pasta temporária na máquina para thumbnails.</FormDescription>
                <FormMessage />
            </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                  <SelectTrigger>
                      <SelectValue placeholder="Selecione um estado" />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Scanner</Button>
        </div>
      </form>
    </Form>
  )
}
