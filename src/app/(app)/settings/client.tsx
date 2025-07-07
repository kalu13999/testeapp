"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Lock, Palette, Settings as SettingsIcon } from "lucide-react";

export default function SettingsClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold">General</h2>
          <p className="text-sm text-muted-foreground">
            Update your profile and application preferences.
          </p>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Admin User" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="admin@flowvault.com" />
              </div>
               <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel of the application.
          </p>
        </div>
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Select your preferred color scheme.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center space-x-2">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch id="dark-mode" disabled />
              </div>
               <p className="text-xs text-muted-foreground mt-2">Theme switching is coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground">
            Manage your password and two-factor authentication.
          </p>
        </div>
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
               <Button variant="secondary">Change Password</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
