
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import React from "react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Client, type RejectionTag } from "@/lib/data"

const getFormSchema = (isAdmin: boolean, isEditing: boolean) => {
    const schema = z.object({
      label: z.string().min(2, "Label must be at least 2 characters."),
      description: z.string().min(1, "Description is required."),
      clientId: z.string().optional(),
    });

    if (isAdmin && !isEditing) {
        return schema.refine(data => !!data.clientId, {
            message: "A client must be selected.",
            path: ["clientId"],
        });
    }

    return schema;
};

export type ReasonFormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface ReasonFormProps {
  reason?: Partial<RejectionTag> | null
  onSave: (values: ReasonFormValues) => void
  onCancel: () => void
  clients?: Client[]
  isEditing?: boolean
  showClientSelector?: boolean
}

export function ReasonForm({ reason, onSave, onCancel, clients, isEditing = false, showClientSelector = false }: ReasonFormProps) {
  const formSchema = getFormSchema(showClientSelector, isEditing);
  
  const form = useForm<ReasonFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: reason?.label || "",
      description: reason?.description || "",
      clientId: reason?.clientId || undefined,
    },
  })

  React.useEffect(() => {
    form.reset({
      label: reason?.label || "",
      description: reason?.description || "",
      clientId: reason?.clientId || undefined,
    })
  }, [reason, form])

  const onSubmit = (values: ReasonFormValues) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rótulo</FormLabel>
              <FormControl>
                <Input placeholder="ex.: Digitalização Desfocada" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                <Textarea placeholder="Uma breve descrição do que isso significa." {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        {showClientSelector && !isEditing && (
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Razão</Button>
        </div>
      </form>
    </Form>
  )
}
