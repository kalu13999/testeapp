
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import React from "react"
import { format } from "date-fns"

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
import { type Client } from "@/lib/data"

const formSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters."),
  contactEmail: z.string().email("Please enter a valid email."),
  contactPhone: z.string().min(1, "Phone number is required."),
  address: z.string().min(1, "Address is required."),
  website: z.string().url("Please enter a valid URL.").or(z.literal('')),
  since: z.string().min(1, "Date is required."),
  info: z.string().optional(),
})

type ClientFormValues = z.infer<typeof formSchema>

interface ClientFormProps {
  client?: Partial<Client> | null
  onSave: (values: ClientFormValues) => void
  onCancel: () => void
}

export function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name || "",
      contactEmail: client?.contactEmail || "",
      contactPhone: client?.contactPhone || "",
      address: client?.address || "",
      website: client?.website || "",
      since: client?.since ? format(new Date(client.since), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      info: client?.info || "",
    },
  })

  React.useEffect(() => {
    form.reset({
      name: client?.name || "",
      contactEmail: client?.contactEmail || "",
      contactPhone: client?.contactPhone || "",
      address: client?.address || "",
      website: client?.website || "",
      since: client?.since ? format(new Date(client.since), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      info: client?.info || "",
    })
  }, [client, form])

  const onSubmit = (values: ClientFormValues) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Cliente</FormLabel>
              <FormControl>
                <Input placeholder="ex.: Innovate Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Contato</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: contact@innovate.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone de Contato</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: 912345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
         <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Morada</FormLabel>
                <FormControl>
                <Input placeholder="ex.: Rua 22, Lisboa" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
         <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                    <Input placeholder="ex.: https://innovate.com" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="since"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Cliente Desde</FormLabel>
                    <FormControl>
                    <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="info"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Informação Adicional</FormLabel>
                <FormControl>
                <Textarea placeholder="Notas adicionais sobre este cliente..." {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Cliente</Button>
        </div>
      </form>
    </Form>
  )
}
