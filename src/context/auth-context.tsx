
"use client";

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import type { User } from '@/lib/data';
import { useUsers } from '@/queries/useUsers';

type AuthContextType = {
  currentUser: User | null;
  isAuthLoading: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean | undefined>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isLoadingUsers) {
      const storedUserId = localStorage.getItem('flowvault_userid');
      if (storedUserId) {
        const user = users?.find(u => u.id === storedUserId);
        if (user) {
          setCurrentUser(user);
        }
      }
      setIsAuthLoading(false);
    }
  }, [isLoadingUsers, users]);

  const login = async (username: string, password: string): Promise<User | null> => {
    const user = users?.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase() && u.password === password);
    if (user) {
      if (user.status === 'disabled') {
        toast({ title: "Login Failed", description: "Your account is disabled. Please contact an administrator.", variant: "destructive" });
        return null;
      }
      setCurrentUser(user);
      localStorage.setItem('flowvault_userid', user.id);
      localStorage.removeItem('flowvault_projectid');
      localStorage.removeItem(`nav_history_${user.id}`);
      
      // Don't load data here; that's the AppProvider's job.
      
      return user;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('flowvault_userid');
    localStorage.removeItem('flowvault_projectid');
    // We don't need to clear all history, just the current user's
    if (currentUser) {
        localStorage.removeItem(`nav_history_${currentUser.id}`);
    }
    // Invalidate queries to ensure fresh state on next login
    queryClient.invalidateQueries(); 
  };
  
  const updateUser = async (userId: string, userData: Partial<User>) => {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) throw new Error('Failed to update user');
        const updatedUser = await response.json();
        
        // Update current user if it's the one being edited
        if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
        }
        await queryClient.invalidateQueries({ queryKey: ['users'] });
        toast({ title: "User Updated" });
    } catch (error) {
        toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    }
  };

  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean | undefined> => {
      try {
          const response = await fetch(`/api/users/${userId}/change-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ currentPassword, newPassword }),
          });
          if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to change password.");
          }
          toast({ title: "Password changed successfully" });
          return true;
      } catch (error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return false;
      }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthLoading, login, logout, changePassword, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
