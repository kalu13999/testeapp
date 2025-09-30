
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
import { type RawBook } from "@/lib/data"

const formSchema = z.object({
  name: z.string().min(2, "Book name must be at least 2 characters."),
  expectedDocuments: z.coerce.number().int().positive("Must be a positive number."),
  author: z.string().optional(),
  isbn: z.string().optional(),
  publicationYear: z.coerce.number().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  info: z.string().optional(),
  color: z.string().optional(),
})

type BookFormValues = z.infer<typeof formSchema>

interface BookFormProps {
  book?: Partial<RawBook> | null
  onSave: (values: BookFormValues) => void
  onCancel: () => void
}

export function BookForm({ book, onSave, onCancel }: BookFormProps) {
  const form = useForm<BookFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: book?.name || "",
      expectedDocuments: book?.expectedDocuments || 0,
      author: book?.author || "",
      isbn: book?.isbn || "",
      publicationYear: book?.publicationYear || undefined,
      priority: book?.priority || "Medium",
      info: book?.info || "",
      color: book?.color || "#FFFFFF",
    },
  })

  React.useEffect(() => {
    form.reset({
      name: book?.name || "",
      expectedDocuments: book?.expectedDocuments || 0,
      author: book?.author || "",
      isbn: book?.isbn || "",
      publicationYear: book?.publicationYear || undefined,
      priority: book?.priority || "Medium",
      info: book?.info || "",
      color: book?.color || "#FFFFFF",
    })
  }, [book, form])

  const onSubmit = (values: BookFormValues) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome do Livro</FormLabel>
                <FormControl>
                    <Input placeholder="ex.: Demonstrações Financeiras 2024" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Autor</FormLabel>
                <FormControl>
                    <Input placeholder="ex.: Departamento Financeiro" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="isbn"
            render={({ field }) => (
                <FormItem>
                <FormLabel>ISBN</FormLabel>
                <FormControl>
                    <Input placeholder="ex.: 978-3-16-148410-0" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="publicationYear"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Ano de Publicação</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="ex.: 2024" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="expectedDocuments"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Páginas Esperadas</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="ex.: 150" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecionar prioridade" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Low">Baixa</SelectItem>
                            <SelectItem value="Medium">Média</SelectItem>
                            <SelectItem value="High">Alta</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                         <Input type="color" {...field} className="h-10 w-20 p-1" />
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
                    <Textarea placeholder="Quaisquer notas adicionais sobre este livro..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Livro</Button>
        </div>
      </form>
    </Form>
  )
}
