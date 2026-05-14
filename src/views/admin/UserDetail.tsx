import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  UserMinus, 
  UserCheck, 
  Loader2, 
  Layers, 
  Calendar, 
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
  Lock,
  Unlock,
  ClipboardList,
  Briefcase,
  X,
  Zap
} from "lucide-react";
import { admin, tasks, auth, projects, adminMicroTasks } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AssignmentDetails } from "@/components/AssignmentDetails";

export default function UserDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [u, setU] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const params = new URLSearchParams(location.search);
        const pId = params.get("projectId");

        const [userRes, profileRes, assignmentsRes] = await Promise.all([
          admin.getUserDetail(id),
          auth.getProfile(),
          tasks.getAll("all", undefined, undefined, undefined, undefined, pId || undefined)
        ]);

        if (userRes.success) {
          const userData = userRes.data;
          setU(userData);
          
          // Fetch micro-tasks if the user is an admin
          if (userData.role === "admin") {
            const microRes = await adminMicroTasks.getAll(100, 0, "all", undefined, id);
            if (microRes.success && microRes.data) {
              const normalizedMicro = microRes.data.map((m: any) => ({
                ...m,
                isMicroTask: true,
                progress: 100, // Submitted micro-tasks are considered completed
                assignedBy: m.submittedBy,
                createdAt: m.submittedAt || m.createdAt,
                tasks: [{
                  _id: m._id,
                  title: m.title,
                  description: m.description,
                  status: "completed",
                  timeSpent: (m.timeSpent || 0) * 60, // Convert minutes to seconds for modal
                  priority: "medium",
                  completedAt: m.reviewedAt || m.submittedAt,
                  completionRemarks: m.masterAdminNote,
                  evidence: m.proofLinks?.[0] || "",
                  evidenceFiles: m.proofFiles || []
                }]
              }));
              
              if (assignmentsRes.success && assignmentsRes.data) {
                const filtered = assignmentsRes.data.filter((a: any) => 
                  (a.assignedTo?._id || a.assignedTo?.id || a.assignedTo) === id
                );
                setUserAssignments([...filtered, ...normalizedMicro].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));
              } else {
                setUserAssignments(normalizedMicro);
              }
            } else if (assignmentsRes.success && assignmentsRes.data) {
              const filtered = assignmentsRes.data.filter((a: any) => 
                (a.assignedTo?._id || a.assignedTo?.id || a.assignedTo) === id
              );
              setUserAssignments(filtered);
            }
          } else if (assignmentsRes.success && assignmentsRes.data) {
            const filtered = assignmentsRes.data.filter((a: any) => 
              (a.assignedTo?._id || a.assignedTo?.id || a.assignedTo) === id
            );
            setUserAssignments(filtered);
          }
        }
        
        if (profileRes.success) setCurrentUser(profileRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, location.search]);

  const fetchAssignmentTasks = async (assignmentId: string) => {
    try {
      const res = await tasks.getAssignmentTasks(assignmentId);
      if (res.success) {
        setSelectedAssignment((prev: any) => ({
          ...prev,
          tasks: res.data
        }));
      }
    } catch (error) {
      console.error("GET /assignments/:id/tasks error:", error);
    }
  };

  const toggleStatus = async () => {
    if (!u) return;
    try {
      const res = await admin.updateUserStatus(u._id || u.id, !u.isActive);
      if (res.success) {
        setU({ ...u, isActive: !u.isActive });
        toast.success(`User access ${!u.isActive ? "restored" : "revoked"}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update status.");
    }
  };

  // Filtering Logic
  const filteredTasks = userAssignments.filter(a => {
    const taskDate = new Date(a.createdAt);
    const now = new Date();

    if (customDate) {
       return taskDate.toDateString() === new Date(customDate).toDateString();
    }

    if (dateFilter === "all") return true;
    if (dateFilter === "today") {
      return taskDate.toDateString() === now.toDateString();
    }
    if (dateFilter === "7days") {
       const weekAgo = new Date();
       weekAgo.setDate(now.getDate() - 7);
       return taskDate >= weekAgo;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = {
    total: userAssignments.length,
    completed: userAssignments.filter(a => a.progress === 100).length,
    pending: userAssignments.filter(a => a.progress < 100).length
  };

  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await projects.getAll();
      if (res.success) setAllProjects(res.data || []);
    };
    fetchProjects();
  }, []);

  const basePath = currentUser?.role === "master_admin" ? "/master-admin" : "/admin";

  return (
    <AppShell role={currentUser?.role || "admin"} title="User Details">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 pb-8">
           <div className="flex items-center gap-5">
              <Avatar className="h-14 w-14 rounded-xl border border-zinc-200">
                 <AvatarFallback className="bg-zinc-50 text-zinc-600 text-lg font-bold uppercase">
                    {u?.name?.split(" ").map((n:any)=>n[0]).join("")}
                 </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                 <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{u?.name}</h1>
                    <span className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                      u?.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                    )}>
                       {u?.isActive ? "Active Account" : "Access Restricted"}
                    </span>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-semibold text-zinc-700 uppercase tracking-tight">
                    <span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-zinc-500" /> {u?.team}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                    <span className="flex items-center gap-1.5">Reference ID: {u?._id?.slice(-8)}</span>
                 </div>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-blue-600">
                 <Link to={`${basePath}/users`}><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back</Link>
              </Button>
              <Button 
                variant="outline"
                className={cn(
                  "h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  u?.isActive ? "border-rose-100 text-rose-500 hover:bg-rose-50" : "border-blue-100 text-blue-600 hover:bg-blue-50"
                )}
                onClick={toggleStatus}
              >
                 {u?.isActive ? <Lock className="mr-2 h-3.5 w-3.5" /> : <Unlock className="mr-2 h-3.5 w-3.5" />}
                 {u?.isActive ? "Revoke Access" : "Grant Access"}
              </Button>
           </div>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           {[
             { label: "Total Assignments", value: stats.total, icon: ClipboardList, color: "text-zinc-600" },
             { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
             { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
           ].map((s, i) => (
             <div key={i} className="bg-white border border-zinc-100 p-7 rounded-2xl shadow-sm flex items-center justify-between group hover:border-zinc-200 transition-all">
                <div>
                 <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{s.label}</p>
                   <h3 className="text-3xl font-bold tracking-tight text-zinc-900">{s.value}</h3>
                </div>
                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center bg-zinc-50 shadow-inner group-hover:scale-110 transition-transform", s.color)}>
                   <s.icon className="h-5 w-5" />
                </div>
             </div>
           ))}
        </div>

        {/* TASK HISTORY SECTION */}
        <section className="space-y-4">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-100 pb-5">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="h-4 w-1 bg-zinc-900 rounded-full" /> Assignment History
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-zinc-100 bg-white">
                    <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                    <input 
                      type="date" 
                      value={customDate}
                      onChange={(e) => { setCustomDate(e.target.value); setCurrentPage(1); }}
                      className="bg-transparent border-none text-[10px] font-bold uppercase outline-none focus:ring-0 w-24 text-zinc-700"
                    />
                    {customDate && (
                      <button onClick={() => setCustomDate("")} className="text-zinc-500 hover:text-rose-500">
                         <X className="h-3 w-3" />
                      </button>
                    )}
                 </div>

                 <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-[150px] rounded-lg bg-zinc-50 border-none text-[10px] font-bold uppercase tracking-wider">
                       <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all" className="text-[10px] font-bold uppercase">All Projects</SelectItem>
                       {allProjects.map(p => (
                         <SelectItem key={p._id} value={p._id} className="text-[10px] font-bold uppercase">{p.name}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>

                 <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCustomDate(""); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-[120px] rounded-lg bg-zinc-50 border-none text-[10px] font-bold uppercase tracking-wider">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all" className="text-[10px] font-bold uppercase">All Time</SelectItem>
                       <SelectItem value="today" className="text-[10px] font-bold uppercase">Today</SelectItem>
                       <SelectItem value="7days" className="text-[10px] font-bold uppercase">Last 7 Days</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </div>

            <div className="space-y-2">
               {paginatedTasks
                 .filter(a => projectFilter === "all" || a.projectId === projectFilter)
                 .length > 0 ? paginatedTasks
                 .filter(a => projectFilter === "all" || a.projectId === projectFilter)
                 .map((a: any) => (
                   <div key={a._id} className="group flex items-center justify-between p-6 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 transition-all shadow-sm">
                     <div className="flex items-center gap-6 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                           {a.isMicroTask ? <Zap className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-3">
                             <h4 className="text-[15px] font-semibold text-zinc-900 tracking-tight truncate">{a.title}</h4>
                             {a.isMicroTask && (
                               <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[8px] font-black uppercase tracking-widest px-1.5 h-4">
                                 Self Assigned
                               </Badge>
                             )}
                           </div>
                           <div className="flex items-center gap-4 text-xs text-zinc-600 font-medium uppercase tracking-tight mt-1.5">
                              <span className="flex items-center gap-2">Lead: {a.assignedBy?.name || "System"}</span>
                              <span className="h-1 w-1 rounded-full bg-zinc-300" />
                              <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-8 ml-6">
                        <div className="hidden sm:flex flex-col items-end gap-2">
                           <p className="text-xs font-bold text-zinc-900">{Math.round(a.progress)}%</p>
                           <div className="h-1.5 w-24 bg-zinc-50 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-zinc-900 transition-all duration-1000" style={{ width: `${a.progress}%` }} />
                           </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-10 px-5 rounded-xl text-[10px] font-bold uppercase tracking-widest border-zinc-200 text-zinc-700 hover:bg-zinc-900 hover:text-white transition-all"
                          onClick={() => { 
                            setSelectedAssignment(a); 
                            if (!a.isMicroTask) {
                              fetchAssignmentTasks(a._id); 
                            }
                            setIsModalOpen(true); 
                          }}
                        >
                           View Details
                        </Button>
                     </div>
                  </div>
               )) : (
                  <div className="py-16 text-center border border-dashed border-zinc-100 rounded-2xl bg-zinc-50/30">
                     <ShieldAlert className="h-8 w-8 text-zinc-200 mx-auto mb-4" />
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No matching history</p>
                  </div>
               )}
            </div>

            {/* PAGINATION CONTROLS */}
            {filteredTasks.length > 0 && (
               <div className="flex items-center justify-between pt-8 border-t border-zinc-50">
                 <div className="flex items-center gap-4">
                    <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                       Page <span className="text-zinc-900">{currentPage}</span> of <span className="text-zinc-900">{totalPages}</span>
                    </p>
                 </div>
                 <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-700 disabled:opacity-40 hover:bg-zinc-50 transition-all"
                      onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                    >
                       <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <div className="h-4 w-[1px] bg-zinc-100 mx-2" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-700 disabled:opacity-40 hover:bg-zinc-50 transition-all"
                      onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === totalPages}
                    >
                       Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                 </div>
              </div>
           )}
        </section>
      </div>

      <AssignmentDetails 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assignment={selectedAssignment}
        currentUser={currentUser}
      />
    </AppShell>
  );
}