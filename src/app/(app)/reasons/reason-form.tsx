
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
import { type RejectionTag } from "@/lib/data"

const formSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters."),
  description: z.string().min(1, "Description is required."),
})

type ReasonFormValues = z.infer<typeof formSchema>

interface ReasonFormProps {
  reason?: Partial<RejectionTag> | null
  onSave: (values: ReasonFormValues) => void
  onCancel: () => void
}

export function ReasonForm({ reason, onSave, onCancel }: ReasonFormProps) {
  const form = useForm<ReasonFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: reason?.label || "",
      description: reason?.description || "",
    },
  })

  React.useEffect(() => {
    form.reset({
      label: reason?.label || "",
      description: reason?.description || "",
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
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Blurry Scan" {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                <Textarea placeholder="A brief description of what this means." {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Reason</Button>
        </div>
      </form>
    </Form>
  )
}
