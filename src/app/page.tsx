
"use client";

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileLock2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { login, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const user = await login(username, password);

    setIsLoading(false);

    if (user) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/dashboard'); 
    } else {
      toast({title: "Login Failed", description: "Invalid username or password. Please try again.", variant: "destructive"});
    }
  };
  
  const isButtonDisabled = isLoading || isAuthLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 inline-block">
            <div className="bg-primary rounded-lg p-3 inline-block">
              <FileLock2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">RFS<br />WkF Doc</CardTitle>
          <CardDescription>Introduza as suas credenciais para aceder à sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Utilizador</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Nome de Utilizador" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isButtonDisabled}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">Palavra-passe</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isButtonDisabled}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isButtonDisabled}>
              {isButtonDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sessão
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
