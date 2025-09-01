
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
import { type Storage } from "@/lib/data"

const formSchema = z.object({
  nome: z.string().min(2, "Name must be at least 2 characters."),
  ip: z.string().min(1, "IP Address is required."),
  root_path: z.string().min(1, "Root path is required."),
  thumbs_path: z.string().min(1, "Thumbnails path is required."),
  percentual_minimo_diario: z.coerce.number().min(0).max(100),
  minimo_diario_fixo: z.coerce.number().min(0),
  peso: z.coerce.number().min(1),
  status: z.enum(["ativo", "inativo", "manutencao"]),
})

export type StorageFormValues = z.infer<typeof formSchema>

interface StorageFormProps {
  storage?: Partial<Storage> | null
  onSave: (values: StorageFormValues) => void
  onCancel: () => void
}

export function StorageForm({ storage, onSave, onCancel }: StorageFormProps) {
  const form = useForm<StorageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: storage?.nome || "",
      ip: storage?.ip || "",
      root_path: storage?.root_path || "",
      thumbs_path: storage?.thumbs_path || "",
      percentual_minimo_diario: storage?.percentual_minimo_diario || 0,
      minimo_diario_fixo: storage?.minimo_diario_fixo || 0,
      peso: storage?.peso || 1,
      status: storage?.status || "ativo",
    },
  })

  const onSubmit = (values: StorageFormValues) => {
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
                  <FormLabel>Nome do Armazenamento</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: Proc-01" {...field} />
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
                    <Input placeholder="ex.: 192.168.1.100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="root_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização Raiz</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: \\192.168.100.10\e$\DATA\0-mainFolder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thumbs_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização de Thumbnails</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: Temp\Thumbs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minimo_diario_fixo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Diário Fixo (Páginas)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                 <FormDescription>Páginas mínimas a enviar antes de usar pesos.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="peso"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso de Distribuição</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>Peso maior recebe mais livros.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Armazenamento</Button>
        </div>
      </form>
    </Form>
  )
}
