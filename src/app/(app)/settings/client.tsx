
"use client"

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAppContext } from '@/context/workflow-context';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SettingsClient() {
  const { currentUser, updateUser, changePassword } = useAppContext();
  const { toast } = useToast();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      jobTitle: currentUser?.jobTitle || '',
    }
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  React.useEffect(() => {
    if (currentUser) {
      profileForm.reset({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        jobTitle: currentUser.jobTitle || '',
      });
    }
  }, [currentUser, profileForm]);

  const onProfileSubmit = (data: ProfileFormValues) => {
    if (!currentUser) return;
    updateUser(currentUser.id, data);
    toast({ title: "Perfil Atualizado", description: "As informações do seu perfil foram guardadas." });
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!currentUser) return;
    const success = await changePassword(currentUser.id, data.currentPassword, data.newPassword);
    if (success) {
      passwordForm.reset();
    }
  };

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Fetching user settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerir a conta e configurações da aplicação.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold">Geral</h2>
          <p className="text-sm text-muted-foreground">
            Atualize seu perfil e preferências de aplicativo.
          </p>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Telefone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={profileForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Guardar Alterações</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold">Segurança</h2>
          <p className="text-sm text-muted-foreground">
            Gerir palavra-passe.
          </p>
        </div>
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
              <CardTitle>Palavra-passe</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Palavra-passe Atual</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Palavra-passe</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Palavra-passe</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="secondary">Alterar Palavra-passe</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold">Aparência</h2>
          <p className="text-sm text-muted-foreground">
            Personalize a aparência e a sensação do aplicativo.
          </p>
        </div>
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
              <CardTitle>Tema</CardTitle>
              <CardDescription>Selecione seu esquema de cores preferido.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center space-x-2">
                <Label htmlFor="dark-mode">Modo Escuro</Label>
                <Switch id="dark-mode" disabled />
              </div>
               <p className="text-xs text-muted-foreground mt-2">A alteração de tema estará disponível em breve.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
