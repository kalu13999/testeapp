
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

const formSchema = z.object({
  name: z.string().min(2, "Book name must be at least 2 characters."),
  expectedDocuments: z.coerce.number().int().positive("Must be a positive number."),
})

type BookFormValues = z.infer<typeof formSchema>

interface BookFormProps {
  book?: { name: string, expectedDocuments: number } | null
  onSave: (values: BookFormValues) => void
  onCancel: () => void
}

export function BookForm({ book, onSave, onCancel }: BookFormProps) {
  const form = useForm<BookFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: book?.name || "",
      expectedDocuments: book?.expectedDocuments || 0,
    },
  })

  React.useEffect(() => {
    form.reset({
      name: book?.name || "",
      expectedDocuments: book?.expectedDocuments || 0,
    })
  }, [book, form])

  const onSubmit = (values: BookFormValues) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Book Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Financial Statements 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expectedDocuments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Pages</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g. 150" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Book</Button>
        </div>
      </form>
    </Form>
  )
}
