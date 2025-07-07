
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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type PermissionGroup } from "./permissions"

const formSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one permission.",
  }),
})

export type RoleData = z.infer<typeof formSchema>

interface RoleFormProps {
  initialData?: Partial<RoleData> | null
  allPermissions: PermissionGroup[]
  onSave: (values: RoleData) => void
  onCancel: () => void
  isEditing?: boolean
}

export function RoleForm({ initialData, allPermissions, onSave, onCancel, isEditing = false }: RoleFormProps) {
  const form = useForm<RoleData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      permissions: initialData?.permissions || [],
    },
  })

  React.useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      permissions: initialData?.permissions || [],
    })
  }, [initialData, form])

  const onSubmit = (values: RoleData) => {
    onSave(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Quality Control Manager" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Permissions</FormLabel>
              </div>
              <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="space-y-4">
                  {allPermissions.map((group) => (
                    <div key={group.group}>
                        <h4 className="font-semibold text-sm mb-2">{group.group}</h4>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {group.permissions.map((item) => (
                            <FormField
                                key={item.id}
                                control={form.control}
                                name="permissions"
                                render={({ field }) => {
                                return (
                                    <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm">
                                        {item.label}
                                        <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                                    </FormLabel>
                                    </FormItem>
                                )
                                }}
                            />
                            ))}
                        </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Role</Button>
        </div>
      </form>
    </Form>
  )
}
