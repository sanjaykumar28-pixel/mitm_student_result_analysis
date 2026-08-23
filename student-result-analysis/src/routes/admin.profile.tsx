import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { 
  User, Mail, Building, ShieldCheck, 
  Edit2, Save, X, Phone, Calendar, Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfile,
});

function AdminProfile() {
  const { user } = useAuth();
  
  const [localProfile, setLocalProfile] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
    institution?: string;
  }>({});
  
  const [isEditing, setIsEditing] = useState(false);
  
  const name = localProfile.name ?? user?.name ?? "Administrator";
  const email = localProfile.email ?? user?.email ?? "admin@example.com";
  const role = user?.role === "admin" ? "Administrator" : "User";
  const phone = localProfile.phone ?? "+1 (555) 000-0000";
  const department = localProfile.department ?? "Computer Science";
  const institution = localProfile.institution ?? "MITM College";
  const adminId = user?.id ?? "ADM-2026-001";
  const status = "Active";
  const joinedDate = "Aug 2023";

  const [editForm, setEditForm] = useState({
    name,
    email,
    phone,
    department,
    institution
  });

  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("") || "A";

  const startEdit = () => {
    setEditForm({ name, email, phone, department, institution });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = () => {
    setLocalProfile({
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      department: editForm.department,
      institution: editForm.institution
    });
    setIsEditing(false);
    alert("Profile updated locally. A backend update API is required for permanent database changes.");
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      <PageHeader title="Admin Profile" subtitle="Manage your administrator account settings and information." />
      
      {/* Profile Header */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="h-32 w-full bg-gradient-to-r from-primary/80 to-primary"></div>
        <CardContent className="relative px-6 pb-6 pt-0 sm:px-10">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <Avatar className="-mt-16 h-32 w-32 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-4xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="mt-4 flex flex-1 flex-col items-center text-center sm:mt-0 sm:items-start sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{name}</h2>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
                <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {email}</span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {role} Account
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Admin ID</span>
              <span className="mt-1 text-sm font-semibold">{adminId}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Department</span>
              <span className="mt-1 text-sm font-semibold">{department}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Joined Date</span>
              <span className="mt-1 text-sm font-semibold">{joinedDate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
              <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success"></span>
                {status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Personal Info */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                  {isEditing ? (
                    <Input className="mt-1 h-8" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                  ) : (
                    <div className="mt-1 text-base font-medium">{name}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                  {isEditing ? (
                    <Input className="mt-1 h-8" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                  ) : (
                    <div className="mt-1 text-base font-medium">{email}</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-4 w-4" /> Phone Number
                  </div>
                  {isEditing ? (
                    <Input className="mt-1 h-8" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                  ) : (
                    <div className="mt-1 text-base font-medium">{phone}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Admin ID</div>
                  <div className="mt-1 text-base font-medium">{adminId}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                Institutional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Department</div>
                  {isEditing ? (
                    <Input className="mt-1 h-8" value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})} />
                  ) : (
                    <div className="mt-1 text-base font-medium">{department}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">College / Institution</div>
                  {isEditing ? (
                    <Input className="mt-1 h-8" value={editForm.institution} onChange={(e) => setEditForm({...editForm, institution: e.target.value})} />
                  ) : (
                    <div className="mt-1 text-base font-medium">{institution}</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Joined Date
                  </div>
                  <div className="mt-1 text-base font-medium">{joinedDate}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Account Status</div>
                  <div className="mt-1 text-base font-medium">{status}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-foreground">Password</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ensure your account is using a long, random password to stay secure.
                </p>
                <Button className="mt-4 w-full sm:w-auto" variant="outline">
                  <Key className="mr-2 h-4 w-4" /> Change Password
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-foreground">Two-Factor Authentication</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add additional security to your account using two-factor authentication.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                  Not enabled
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
