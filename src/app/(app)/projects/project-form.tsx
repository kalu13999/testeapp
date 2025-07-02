
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
import { Textarea } from "@/components/ui/textarea"
import { type Client, type Project } from "@/lib/data"

const formSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters."),
  clientId: z.string({ required_error: "Please select a client." }),
  description: z.string().min(1, "Description is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  budget: z.coerce.number().positive("Budget must be a positive number."),
  status: z.enum(["Planning", "In Progress", "Complete", "On Hold"]),
  info: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof formSchema>

interface ProjectFormProps {
  project?: Partial<Project> | null
  clients: Client[]
  onSave: (values: ProjectFormValues) => void
  onCancel: () => void
}

export function ProjectForm({ project, clients, onSave, onCancel }: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name || "",
      clientId: project?.clientId || "",
      description: project?.description || "",
      startDate: project?.startDate || new Date().toISOString().split('T')[0],
      endDate: project?.endDate || "",
      budget: project?.budget || 0,
      status: project?.status || "Planning",
      info: project?.info || "",
    },
  })

  React.useEffect(() => {
    form.reset({
       name: project?.name || "",
      clientId: project?.clientId || "",
      description: project?.description || "",
      startDate: project?.startDate || new Date().toISOString().split('T')[0],
      endDate: project?.endDate || "",
      budget: project?.budget || 0,
      status: project?.status || "Planning",
      info: project?.info || "",
    })
  }, [project, form])

  const onSubmit = (values: ProjectFormValues) => {
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
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Q4 Scanning" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {clients.map(client => (
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
        </div>
        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                    <Textarea placeholder="A brief description of the project." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                    <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                    <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
         <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Budget ($)</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="e.g. 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Planning">Planning</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                            <SelectItem value="Complete">Complete</SelectItem>
                        </SelectContent>
                    </Select>
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
                <FormLabel>Additional Info</FormLabel>
                <FormControl>
                    <Textarea placeholder="Any extra notes about this project..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Project</Button>
        </div>
      </form>
    </Form>
  )
}
