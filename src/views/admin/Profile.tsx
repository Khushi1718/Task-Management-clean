import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Shield, User, MapPin, Building, Key, Loader2 } from "lucide-react";
import { auth } from "@/lib/api";
import { formatDate } from "@/lib/mock-data";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminProfile() {
  const [u, setU] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({ name: "", email: "", team: "" });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setIsSubmittingPassword(true);
    try {
      const res = await auth.updatePassword(passwordData.current, passwordData.new);
      if (res.success) {
        toast.success("Password updated successfully");
        setIsPasswordDialogOpen(false);
        setPasswordData({ current: "", new: "", confirm: "" });
      } else {
        toast.error(res.message || "Failed to update password");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await auth.getProfile();
        if (res.success) {
          setU(res.data);
          setProfileData({ name: res.data.name, email: res.data.email, team: res.data.team });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    try {
      const res = await auth.updateProfile(profileData.name, profileData.email, profileData.team);
      if (res.success) {
        toast.success("Profile updated successfully");
        setU(res.data);
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  if (loading) {
    return (
      <AppShell role={u?.role || "admin"} title={`${u?.role === "master_admin" ? "Master" : "Admin"} Settings`} subtitle="Manage your workspace administrative preferences.">
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!u) return null;

  return (
    <AppShell role={u.role} title={`${u.role === "master_admin" ? "Master" : "Admin"} Settings`} subtitle="Manage your workspace administrative preferences.">
      <div className="grid gap-6 lg:grid-cols-[1fr_350px] max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <section className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border-b border-border relative">
              <div className="absolute top-4 right-4 bg-background/80 backdrop-blur text-xs font-semibold px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 shadow-sm text-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {u.role === "master_admin" ? "Super Admin" : "Workspace Admin"}
              </div>
            </div>
            <div className="px-8 pb-8 pt-0 relative sm:flex sm:items-end sm:justify-between">
              <div className="sm:flex sm:items-end sm:gap-6">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg -mt-12 bg-background relative z-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {u.name.split(" ").map((p) => p[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-4 sm:mt-0 pb-1">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{u.name}</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    {u.team} Department
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Personal Information Form */}
          <section className="rounded-xl border border-border bg-card p-8 shadow-card">
            <div className="mb-6 border-b border-border pb-4">
              <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Update your personal details and how they appear to others.</p>
            </div>
            
            <form className="grid gap-6 md:grid-cols-2" onSubmit={handleProfileUpdate}>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</Label>
                <Input value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} className="h-10 bg-secondary/20 shadow-xs" required />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} type="email" className="h-10 pl-9 bg-secondary/20 shadow-xs" required />
                </div>
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
                <Input value={profileData.team} onChange={(e) => setProfileData({...profileData, team: e.target.value})} className="h-10 bg-secondary/20 shadow-xs" required />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Mumbai, Maharashtra" className="h-10 pl-9 bg-secondary/20 shadow-xs" />
                </div>
              </div>
              
              <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-border mt-2">
                <Button type="button" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setProfileData({ name: u.name, email: u.email, team: u.team })}>Cancel</Button>
                <Button type="submit" className="px-6 shadow-sm" disabled={isSubmittingProfile}>
                  {isSubmittingProfile ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          {/* Security & Access */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2 mb-4">
              <Key className="h-4 w-4 text-primary" /> Security & Access
            </h3>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Manage your credentials.</p>
                
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full bg-background shadow-xs">Update Password</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handlePasswordUpdate}>
                      <DialogHeader>
                        <DialogTitle>Update Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and a new secure password.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="current">Current Password</Label>
                          <Input 
                            id="current" 
                            type="password" 
                            value={passwordData.current} 
                            onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} 
                            required 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new">New Password</Label>
                          <Input 
                            id="new" 
                            type="password" 
                            value={passwordData.new} 
                            onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} 
                            required 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm">Confirm New Password</Label>
                          <Input 
                            id="confirm" 
                            type="password" 
                            value={passwordData.confirm} 
                            onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} 
                            required 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmittingPassword}>
                          {isSubmittingPassword ? "Saving..." : "Save Password"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </section>

          {/* Account Details Summary */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4">Account Summary</h3>
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground font-medium">Role</dt>
                <dd className="font-semibold text-foreground flex items-center gap-1.5 capitalize">
                  <Shield className="h-3.5 w-3.5 text-primary" /> {u.role.replace('_', ' ')}
                </dd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground font-medium">Total Work Logs</dt>
                <dd className="font-semibold text-foreground text-base">{u.totalLogs || 0}</dd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground font-medium">Joined Workspace</dt>
                <dd className="font-semibold text-foreground">{formatDate(u.joinedAt)}</dd>
              </div>
              <div className="flex items-center justify-between py-1">
                <dt className="text-muted-foreground font-medium">Status</dt>
                {u.isActive ? (
                  <dd className="font-semibold text-success flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success"></span> Active
                  </dd>
                ) : (
                  <dd className="font-semibold text-destructive flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive"></span> Inactive
                  </dd>
                )}
              </div>
              {!u.isActive && u.leftAt && (
                <div className="flex items-center justify-between py-1 border-t border-border/50 pt-3 mt-3">
                  <dt className="text-muted-foreground font-medium">Last Day</dt>
                  <dd className="font-semibold text-foreground">{formatDate(u.leftAt)}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}