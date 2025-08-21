
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
import { type User, type Client, type Project } from "@/lib/data"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters.").or(z.literal("")).optional(),
  role: z.string({ required_error: "Please select a role." }),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  info: z.string().optional(),
  clientId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
}).refine(data => {
    if (['Client', 'Client Manager', 'Client Operator'].includes(data.role) && !data.clientId) {
        return false;
    }
    return true;
}, {
    message: "A client company must be selected for this role.",
    path: ["clientId"],
});

export type UserFormValues = z.infer<typeof formSchema>

interface UserFormProps {
  user?: Partial<User> | null
  roles: string[]
  clients: Client[]
  projects: Project[]
  onSave: (values: UserFormValues) => void
  onCancel: () => void
}

export function UserForm({ user, roles, clients, projects, onSave, onCancel }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      password: "", // Always empty for security
      role: user?.role || "",
      phone: user?.phone || "",
      jobTitle: user?.jobTitle || "",
      department: user?.department || "",
      info: user?.info || "",
      clientId: user?.clientId || undefined,
      projectIds: user?.projectIds || [],
    },
  })
  
  const role = form.watch("role");
  const isClientRole = ['Client', 'Client Manager', 'Client Operator'].includes(role);
  const isOperatorRole = role && !isClientRole && role !== 'Admin' && role !== 'System';


  React.useEffect(() => {
    if (!isClientRole && form.getValues('clientId')) {
      form.setValue('clientId', undefined, { shouldValidate: true });
    }
    if (isClientRole || role === 'Admin') {
      form.setValue('projectIds', [], { shouldValidate: true });
    }
  }, [role, form, isClientRole]);

  React.useEffect(() => {
    form.reset({
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      password: "", // Always empty for security
      role: user?.role || "",
      phone: user?.phone || "",
      jobTitle: user?.jobTitle || "",
      department: user?.department || "",
      info: user?.info || "",
      clientId: user?.clientId || undefined,
      projectIds: user?.projectIds || [],
    })
  }, [user, form])

  const onSubmit = (values: UserFormValues) => {
    const dataToSave: Partial<UserFormValues> = { ...values };
    if (!dataToSave.password) {
        delete dataToSave.password;
    }
    onSave(dataToSave as UserFormValues)
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
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. jdoe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                        Leave blank to keep current password.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 555-123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isClientRole && (
            <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Associated Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a client for this user" />
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
        )}
        
        {isOperatorRole && (
          <FormField
            control={form.control}
            name="projectIds"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Associated Projects</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value || field.value.length === 0 && "text-muted-foreground"
                        )}
                      >
                        {field.value && field.value.length > 0
                          ? `${field.value.length} project(s) selected`
                          : "Select projects"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <ScrollArea className="h-48">
                      <div className="p-4">
                        {projects.map((project) => (
                          <FormField
                            key={project.id}
                            control={form.control}
                            name="projectIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={project.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(project.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), project.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== project.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {project.name}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                <FormDescription>Leave blank to grant access to all non-client projects.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
         <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Document Specialist" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Operations" {...field} />
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
                <FormLabel>Additional Info</FormLabel>
                <FormControl>
                <Textarea placeholder="Any extra notes about this user..." {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save User</Button>
        </div>
      </form>
    </Form>
  )
}
