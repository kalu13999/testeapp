
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
import { type ProjectStorage, type Project, type Storage } from "@/lib/data"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  projectId: z.string({ required_error: "A project is required." }),
  storageId: z.number({ required_error: "A storage location is required." }),
  peso: z.coerce.number().min(1, "Weight must be at least 1."),
  minimo_diario_fixo: z.coerce.number().min(0, "Cannot be negative."),
  percentual_minimo_diario: z.coerce.number().min(0).max(100, "Must be between 0 and 100."),
  descricao: z.string().optional(),
  obs: z.string().optional(),
})

export type AssociationFormValues = z.infer<typeof formSchema>

interface ProjectStorageAssociationFormProps {
  association?: Partial<ProjectStorage> | null
  projects: Project[]
  storages: Storage[]
  onSave: (values: AssociationFormValues) => void
  onCancel: () => void
  isEditing?: boolean
}

export function ProjectStorageAssociationForm({
  association,
  projects,
  storages,
  onSave,
  onCancel,
  isEditing = false
}: ProjectStorageAssociationFormProps) {
  const form = useForm<AssociationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: association?.projectId || "",
      storageId: association?.storageId || 0,
      peso: association?.peso || 1,
      minimo_diario_fixo: association?.minimo_diario_fixo || 0,
      percentual_minimo_diario: association?.percentual_minimo_diario || 0,
      descricao: association?.descricao || "",
      obs: association?.obs || "",
    },
  })

  React.useEffect(() => {
    form.reset({
      projectId: association?.projectId || "",
      storageId: association?.storageId || 0,
      peso: association?.peso || 1,
      minimo_diario_fixo: association?.minimo_diario_fixo || 0,
      percentual_minimo_diario: association?.percentual_minimo_diario || 0,
      descricao: association?.descricao || "",
      obs: association?.obs || "",
    })
  }, [association, form])

  const onSubmit = (values: AssociationFormValues) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar um projeto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="storageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Armazenamento</FormLabel>
                <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value.toString()} disabled={isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar um armazenamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {storages.map(storage => (
                      <SelectItem key={storage.id} value={String(storage.id)}>
                        {storage.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
           <FormField
            control={form.control}
            name="peso"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso de Distribuição</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormDescription className="text-xs">Peso maior recebe mais livros.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minimo_diario_fixo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mínimo Fixo Diário</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                 <FormDescription className="text-xs">Min. páginas antes da ponderação.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="percentual_minimo_diario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>% Mínimo Diário</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormDescription className="text-xs">Min. % do total diário.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Opcional: Descrever a associação..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Associação</Button>
        </div>
      </form>
    </Form>
  )
}
