import { useEffect, useState, useCallback } from "react";
import { Link } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft,
  ChevronRight, 
  Search, 
  Users, 
  ShieldCheck, 
  UserPlus,
  Loader2, 
  X,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { admin, auth } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Debounce hook for high-performance search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function InviteUserDialog({ onUserAdded, currentUserRole }: { onUserAdded: () => void, currentUserRole: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [team, setTeam] = useState("Management");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await auth.register(name, email, password, role, team);
      if (response.success) {
        toast.success("User successfully added.");
        setOpen(false);
        onUserAdded();
        setName("");
        setEmail("");
        setPassword("");
        setRole("employee");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-sm hover:bg-zinc-800 transition-all">
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl rounded-xl">
        <header className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-900">
           <DialogTitle className="text-lg font-bold tracking-tight">Add New User</DialogTitle>
           <DialogDescription className="text-xs font-medium text-zinc-500 mt-1">Create a new account for an admin or employee.</DialogDescription>
        </header>
        <form onSubmit={handleInvite} className="px-8 py-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full Name</Label>
              <Input placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} required className="h-10 rounded-md bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:ring-1 ring-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</Label>
              <Input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-10 rounded-md bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:ring-1 ring-zinc-200" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</Label>
            <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="h-10 rounded-md bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:ring-1 ring-zinc-200" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">User Role</Label>
              <Select value={role} onValueChange={(v: "admin"|"employee") => setRole(v)}>
                <SelectTrigger className="h-10 rounded-md bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="employee" className="text-xs font-medium">Employee</SelectItem>
                  {currentUserRole === "master_admin" && (
                    <SelectItem value="admin" className="text-xs font-medium">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Department</Label>
              <Input 
                placeholder="e.g. Tech, SEO, Editing" 
                value={team} 
                onChange={e => setTeam(e.target.value)} 
                required 
                className="h-10 rounded-md bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase focus:ring-1 ring-zinc-200" 
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full h-11 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-widest shadow-lg" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AllUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500); // 500ms delay to save API calls
  
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dept = params.get("department");
      const role = params.get("role");
      if (dept) setDepartmentFilter(dept);
      if (role) setRoleFilter(role);
    }
  }, []);
  
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const skip = (page - 1) * limit;
      
      const [usersRes, profileRes] = await Promise.all([
        admin.getAllUsers(limit, skip, debouncedSearch, departmentFilter, roleFilter),
        auth.getProfile()
      ]);
      
      if (usersRes.success) {
        setUsers(usersRes.data || []);
        if (usersRes.pagination) {
          setTotalCount(usersRes.pagination.total);
        }
      }
      if (profileRes.success) {
        setCurrentUser(profileRes.data);
      }
    } catch (error) {
      toast.error("Failed to load user directory.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, departmentFilter, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentFilter, roleFilter]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <AppShell
      role={currentUser?.role || "admin"}
      title="User Directory"
      subtitle={`Enterprise database: ${totalCount} total nodes sync.`}
      actions={currentUser && <InviteUserDialog onUserAdded={fetchData} currentUserRole={currentUser.role} />}
    >
      <div className="max-w-[1300px] mx-auto px-6 py-8 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* REFINED FILTER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-900 pb-8">
           <div className="flex flex-1 items-center gap-3 max-w-4xl">
              <div className="relative group flex-1">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 transition-colors group-focus-within:text-zinc-900" />
                 <Input 
                   placeholder="Search by name or email..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="h-10 pl-10 rounded-md bg-white dark:bg-slate-800 border-zinc-200 dark:border-slate-600 text-xs font-medium shadow-sm transition-all focus:ring-1 ring-zinc-200 dark:text-slate-100 dark:placeholder:text-slate-500" 
                 />
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                 <SelectTrigger className="h-10 w-[160px] rounded-md bg-white dark:bg-slate-800 border-zinc-200 dark:border-slate-600 text-xs font-bold uppercase tracking-wider dark:text-slate-200">
                    <SelectValue placeholder="Department" />
                 </SelectTrigger>
                 <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="all" className="text-xs font-bold">All Departments</SelectItem>
                    <SelectItem value="Tech" className="text-xs font-bold uppercase">Tech</SelectItem>
                    <SelectItem value="SEO" className="text-xs font-bold uppercase">SEO</SelectItem>
                    <SelectItem value="Editing" className="text-xs font-bold uppercase">Editing</SelectItem>
                    <SelectItem value="Management" className="text-xs font-bold uppercase">Management</SelectItem>
                 </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                 <SelectTrigger className="h-10 w-[140px] rounded-md bg-white dark:bg-slate-800 border-zinc-200 dark:border-slate-600 text-xs font-bold uppercase tracking-wider dark:text-slate-200">
                    <SelectValue placeholder="Role" />
                 </SelectTrigger>
                 <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="all" className="text-xs font-bold">All Roles</SelectItem>
                    <SelectItem value="admin" className="text-xs font-bold uppercase">Admins</SelectItem>
                    <SelectItem value="employee" className="text-xs font-bold uppercase">Employees</SelectItem>
                 </SelectContent>
              </Select>
           </div>
           
           <div className="flex items-center gap-2 px-4 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Indexed Search
           </div>
        </div>

        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
             <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3">
              {users.length > 0 ? users.map((u) => {
                const basePath = currentUser?.role === "master_admin" ? "/master-admin" : "/admin";
                return (
                <Link
                  key={u.id || u._id}
                  to={`${basePath}/users/${u.id || u._id}`}
                  className="group flex items-center justify-between p-5 rounded-xl bg-white dark:bg-slate-800/70 border border-zinc-200 dark:border-slate-700/60 shadow-sm transition-all hover:border-zinc-300 dark:hover:border-slate-600 hover:shadow-md"
                >
                  <div className="flex items-center gap-5">
                    <Avatar className="h-10 w-10 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-transform group-hover:scale-105">
                      <AvatarFallback className="bg-zinc-50 dark:bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                        {u.name?.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">{u.name}</h4>
                        <span className={cn(
                          "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                          (u.role || "").toLowerCase().includes("admin") ? "bg-amber-50 text-amber-600 border-amber-200/50" : "bg-zinc-50 text-zinc-500 border-zinc-200/50"
                        )}>
                          {u.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] font-medium text-zinc-400 tracking-tighter">
                        <span className="truncate max-w-[200px]">{u.email}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-200" />
                        <span className="uppercase font-bold text-zinc-900 dark:text-zinc-300">{u.team || "Operations"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden lg:flex flex-col items-end gap-0.5 px-6 border-r border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] font-bold uppercase text-zinc-300 dark:text-zinc-700 tracking-wider">Total Output</span>
                        <span className="text-[11px] font-bold text-zinc-500">{u.totalLogs || 0} Logs</span>
                    </div>
                    <div className="h-8 w-8 rounded-md bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                        <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
                );
              }) : (
                <div className="p-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                   <AlertCircle className="h-10 w-10 text-zinc-200 mx-auto mb-4" />
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No users found.</p>
                </div>
              )}
            </div>

            {/* HIGH-PERFORMANCE PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-900 pt-8">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Showing {(page-1)*limit + 1} to {Math.min(page*limit, totalCount)} of {totalCount} nodes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-md border-zinc-200"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                       // Simple pagination window logic
                       let pageNum = i + 1;
                       if (totalPages > 5 && page > 3) {
                         pageNum = page - 3 + i;
                       }
                       if (pageNum > totalPages) return null;
                       
                       return (
                         <Button
                           key={pageNum}
                           variant={page === pageNum ? "default" : "outline"}
                           size="sm"
                           className={cn("h-8 w-8 p-0 rounded-md text-[10px] font-bold", page === pageNum ? "bg-zinc-900 text-white" : "border-zinc-200")}
                           onClick={() => setPage(pageNum)}
                         >
                           {pageNum}
                         </Button>
                       );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-md border-zinc-200"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);