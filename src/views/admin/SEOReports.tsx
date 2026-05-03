import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Users, 
  Calendar, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ClipboardList,
  BarChart3,
  ChevronLeft,
  ShieldAlert
} from "lucide-react";
import { admin, auth, tasks } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AssignmentDetails } from "@/components/AssignmentDetails";

// Debounce for high-speed search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SEOReports() {
  const [users, setUsers] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  // Selection State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  // Detail View Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const FIXED_DEPARTMENT = "SEO";

  // 1. Fetch Specialists (Optimized Server-Side)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        // Fetch only SEO department users from the server
        const [usersRes, profileRes] = await Promise.all([
          admin.getAllUsers(50, 0, debouncedSearch, FIXED_DEPARTMENT, "employee"),
          auth.getProfile()
        ]);
        
        if (profileRes.success) setCurrentUser(profileRes.data);
        if (usersRes.success) {
          setUsers(usersRes.data || []);
          setTotalUsers(usersRes.pagination?.total || usersRes.data.length);
        }
      } catch (error) {
        toast.error("Failed to load specialist nodes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearch]);

  // 2. Fetch User Details (Optimized: only for selected user)
  const handleUserClick = async (user: any) => {
    try {
      setIsLoadingDetail(true);
      setSelectedUser(user);
      
      // Fetch only assignments for THIS user (using the new API filter)
      const res = await tasks.getAll("all", undefined, undefined, undefined, undefined, undefined, user._id || user.id);
      
      if (res.success) {
        setUserAssignments(res.data || []);
      }
      
      setCurrentPage(1);
      setDateFilter("all");
      setCustomDate("");
    } catch (error) {
      toast.error("Failed to synchronize user history.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Detail View Filtering (Still client-side for the specific user set as it's typically small)
  const filteredTasks = userAssignments.filter(a => {
    const taskDate = new Date(a.createdAt);
    const now = new Date();
    if (customDate) return taskDate.toDateString() === new Date(customDate).toDateString();
    if (dateFilter === "all") return true;
    if (dateFilter === "today") return taskDate.toDateString() === now.toDateString();
    if (dateFilter === "7days") {
       const weekAgo = new Date();
       weekAgo.setDate(now.getDate() - 7);
       return taskDate >= weekAgo;
    }
    return true;
  });

  const limit = 5;
  const totalPages = Math.ceil(filteredTasks.length / limit);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * limit, currentPage * limit);

  const stats = {
    total: userAssignments.length,
    completed: userAssignments.filter(a => a.progress === 100).length,
    pending: userAssignments.filter(a => a.progress < 100).length
  };

  if (selectedUser) {
    return (
      <AppShell role={currentUser?.role || "admin"} title="Node Detail">
        <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-zinc-100 dark:border-zinc-900 pb-10">
             <div className="flex items-center gap-6">
                <Avatar className="h-16 w-16 border border-zinc-200 shadow-sm">
                   <AvatarFallback className="bg-zinc-50 dark:bg-zinc-900 text-zinc-400 text-xl font-bold uppercase">
                      {selectedUser.name?.split(" ").map((n:any)=>n[0]).join("")}
                   </AvatarFallback>
                </Avatar>
                <div>
                   <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{selectedUser.name}</h1>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border-emerald-200/50">
                         SEO SPECIALIST
                      </Badge>
                   </div>
                   <div className="flex items-center gap-4 mt-1.5 text-[11px] font-medium text-zinc-400 uppercase tracking-tighter">
                      <span>{selectedUser.email}</span>
                      <span className="h-1 w-1 rounded-full bg-zinc-200" />
                      <span>{selectedUser.team || "SEO"}</span>
                   </div>
                </div>
             </div>
             <Button onClick={() => setSelectedUser(null)} variant="outline" className="h-10 px-6 rounded-xl border-zinc-200 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-950 hover:text-white transition-all shadow-sm">
                <ArrowLeft className="mr-3 h-4 w-4" /> Back to Directory
             </Button>
          </header>

          {isLoadingDetail ? (
             <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Synchronizing...</p>
             </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { label: "Active Bundles", value: stats.total, icon: ClipboardList, color: "text-zinc-400" },
                   { label: "Completed Output", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
                   { label: "In-Progress Tasks", value: stats.pending, icon: Clock, color: "text-amber-500" },
                 ].map((s, i) => (
                   <div key={i} className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                         <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{s.label}</p>
                         <s.icon className={cn("h-5 w-5", s.color)} />
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">{s.value}</h3>
                   </div>
                 ))}
              </div>

              <section className="space-y-8">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-900 pb-8">
                    <h2 className="text-[11px] font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-[0.4em] flex items-center gap-3">
                       <BarChart3 className="h-5 w-5 text-zinc-400" /> Performance Log
                    </h2>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2 px-4 h-10 rounded-xl border border-zinc-100 bg-zinc-50/50">
                          <Calendar className="h-4 w-4 text-zinc-400" />
                          <input 
                            type="date" 
                            value={customDate}
                            onChange={(e) => { setCustomDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-[10px] font-black uppercase outline-none focus:ring-0 w-28"
                          />
                          {customDate && <button onClick={() => setCustomDate("")}><X className="h-3 w-3 text-zinc-400" /></button>}
                       </div>
                       <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCustomDate(""); setCurrentPage(1); }}>
                          <SelectTrigger className="h-10 w-[160px] rounded-xl bg-white border-zinc-200 text-[10px] font-black uppercase tracking-widest shadow-sm">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-zinc-200">
                             <SelectItem value="all" className="text-[10px] font-bold">Full History</SelectItem>
                             <SelectItem value="today" className="text-[10px] font-bold">Today Only</SelectItem>
                             <SelectItem value="7days" className="text-[10px] font-bold">Last 7 Days</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="grid gap-4">
                    {paginatedTasks.length > 0 ? paginatedTasks.map((a: any) => (
                       <div key={a._id} className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between gap-6">
                             <div className="flex items-center gap-6 flex-1">
                                <h4 className="text-[14px] font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{a.title}</h4>
                             </div>
                             <div className="flex items-center gap-8">
                                <div className="text-right">
                                   <p className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">{Math.round(a.progress)}%</p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-9 px-5 rounded-xl border-zinc-100 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-950 hover:text-white transition-all shadow-sm"
                                  onClick={() => { setSelectedAssignment(a); setIsModalOpen(true); }}
                                >
                                   Details
                                </Button>
                             </div>
                          </div>
                       </div>
                    )) : (
                       <div className="py-24 text-center border border-dashed border-zinc-100 rounded-[32px] bg-zinc-50/50">
                          <ShieldAlert className="h-12 w-12 text-zinc-100 mx-auto mb-6" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">No Records</h3>
                       </div>
                    )}
                 </div>

                 {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-10">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                       <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-10 rounded-xl px-4 text-[10px] font-black uppercase" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
                             <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-10 rounded-xl px-4 text-[10px] font-black uppercase" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}>
                             <ChevronRight className="h-4 w-4" />
                          </Button>
                       </div>
                    </div>
                 )}
              </section>
            </>
          )}

          <AssignmentDetails 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            assignment={selectedAssignment}
            currentUser={currentUser}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role={currentUser?.role || "admin"} title="SEO Directory">
      <div className="max-w-[1300px] mx-auto px-10 py-12 space-y-12">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10">
           <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">SEO Specialist Directory</h1>
              <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-3">High-speed monitoring of specialist performance nodes</p>
           </div>
           <div className="flex items-center gap-4 px-4 h-12 rounded-2xl bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
              <ShieldCheck className="h-4 w-4" /> Real-time Sync
           </div>
        </header>

        <div className="relative group max-w-2xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
           <Input 
             placeholder="Search SEO nodes..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="h-12 pl-12 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-100 shadow-sm text-xs font-bold uppercase tracking-tight focus:ring-2 ring-zinc-100" 
           />
        </div>

        {isLoading ? (
           <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-200" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing nodes...</p>
           </div>
        ) : (
          <div className="grid gap-4">
             {users.length > 0 ? users.map((u) => (
                <div
                  key={u.id || u._id}
                  onClick={() => handleUserClick(u)}
                  className="group flex items-center justify-between p-6 rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-100 shadow-sm transition-all hover:border-zinc-300 hover:scale-[1.01] cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                     <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
                        <AvatarFallback className="bg-zinc-950 text-white text-xs font-black uppercase">
                           {u.name?.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                     </Avatar>
                     <div>
                        <h4 className="text-[15px] font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{u.name}</h4>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                           <span>{u.email}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-10">
                     <div className="hidden lg:flex flex-col items-end gap-1 px-8 border-r border-zinc-100">
                        <span className="text-[9px] font-black uppercase text-zinc-300 tracking-widest">Total Output</span>
                        <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-50">{u.totalLogs || 0} Tasks</span>
                     </div>
                     <div className="h-10 w-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                        <ChevronRight className="h-5 w-5" />
                     </div>
                  </div>
                </div>
             )) : (
                <div className="p-16 text-center border border-dashed border-zinc-200 rounded-[40px]">
                   <AlertCircle className="h-10 w-10 text-zinc-200 mx-auto mb-4" />
                   <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">No nodes detected.</p>
                </div>
             )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
