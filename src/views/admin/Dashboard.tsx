import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { admin, auth, tasks, adminMicroTasks } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { cn } from "@/lib/utils";
import { SubmitMicroTaskModal } from "@/components/SubmitMicroTaskModal";

import { 
  CheckCircle2, 
  Users, 
  Loader2, 
  ClipboardList, 
  Activity,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Briefcase,
  Monitor,
  Clock,
  Sparkles,
  Globe,
  Layers,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  SendHorizonal
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, animate } from "framer-motion";

// CountUp Component for "Increasing Digits"
function CountUp({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 0.3,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(Math.floor(latest))
    });
    return () => controls.stop();
  }, [value]);

  return <span>{displayValue}</span>;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export default function AdminDashboard() {
  const { user: storeUser } = useAuthStore();
  const [user, setUser] = useState<any>(storeUser);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [graphRange, setGraphRange] = useState<"this" | "last">("this");
  const [isMicroTaskModalOpen, setIsMicroTaskModalOpen] = useState(false);

  const [byAdminStats, setByAdminStats] = useState({
    total: 0, completed: 0, pending: 0, todayTotal: 0, todayCompleted: 0, todayPending: 0
  });
  const [toAdminStats, setToAdminStats] = useState({
    total: 0, completed: 0, pending: 0, todayTotal: 0, todayCompleted: 0, todayPending: 0
  });
  
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Parallelize data fetching but skip profile if we have it
        const tasksPromise = tasks.getAll("all");
        const microTasksPromise = adminMicroTasks.getAll(100, 0, "all");
        const profilePromise = !storeUser ? auth.getProfile() : Promise.resolve({ success: true, data: storeUser });

        const [profileRes, tasksRes, microTasksRes] = await Promise.all([
          profilePromise,
          tasksPromise,
          microTasksPromise
        ]);

        if (!profileRes.success) throw new Error("Profile fetch failed");
        
        const myProfile = profileRes.data;
        setUser(myProfile);

        
        let assignmentsData = tasksRes.data || [];
        
        // Merge micro-tasks as self-assignments
        if (microTasksRes.success && microTasksRes.data) {
          const normalizedMicro = microTasksRes.data.map((mt: any) => ({
            ...mt,
            isMicroTask: true,
            assignedTo: mt.submittedBy,
            assignedBy: { name: "Self (Admin Submission)" },
            status: "completed",
            createdAt: mt.submittedAt,
            progress: 100,
            totalTasks: 1,
            completedTasks: 1,
            pendingTasks: 0,
            tasks: [{
              title: mt.title,
              description: mt.description,
              status: "completed",
              completedAt: mt.submittedAt,
              timeSpent: (mt.timeSpent || 0) * 60,
              taskDate: mt.taskDate
            }]
          }));
          assignmentsData = [...assignmentsData, ...normalizedMicro];
        }
        const myId = String(myProfile?._id || myProfile?.id || "");

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const getStrId = (u: any) => {
          if (!u) return "";
          if (typeof u === 'string') return u;
          return String(u._id || u.id || "");
        };

        // Group A: Assigned BY me (to employees/others)
        const assignedByMe = assignmentsData.filter((a: any) => {
          const assignerId = getStrId(a.assignedBy);
          const assigneeId = getStrId(a.assignedTo);
          return assignerId === myId && assigneeId !== myId;
        });

        // Group B: Assigned TO me (by master/others)
        const assignedToMe = assignmentsData.filter((a: any) => {
          const assigneeId = getStrId(a.assignedTo);
          return assigneeId === myId;
        });

        const calculateGroupStats = (assignments: any[]) => {
          let total = 0, completed = 0, pending = 0;
          let todayTotal = 0, todayCompleted = 0, todayPending = 0;

          assignments.forEach(a => {
            const aTotal = a.totalTasks || (a.tasks?.length || 0);
            const aDone = a.completedTasks || (a.tasks?.filter((t: any) => t.status === 'completed').length || 0);
            
            total += aTotal;
            completed += aDone;
            pending += (aTotal - aDone);
            
            const isCreatedToday = new Date(a.createdAt).toDateString() === now.toDateString();

            if (a.tasks && Array.isArray(a.tasks)) {
              a.tasks.forEach((t: any) => {
                const taskDoneAt = t.completedAt ? new Date(t.completedAt) : null;
                const isDoneToday = taskDoneAt && taskDoneAt.toDateString() === now.toDateString();

                if (isCreatedToday) todayTotal++;
                if (t.status === "completed" && isDoneToday) todayCompleted++;
                if (t.status !== "completed" && isCreatedToday) todayPending++;
              });
            } else if (isCreatedToday) {
               todayTotal += aTotal;
               todayPending += (aTotal - aDone);
            }
          });

          return { total, completed, pending, todayTotal, todayCompleted, todayPending };
        };

        setByAdminStats(calculateGroupStats(assignedByMe));
        setToAdminStats(calculateGroupStats(assignedToMe));
        
        // Activity Logs: Flatten tasks and sort by recency
        const flattenedLogs: any[] = [];
        assignmentsData.forEach((a: any) => {
          if (a.tasks) {
            a.tasks.forEach((t: any) => {
              flattenedLogs.push({
                ...t,
                assignmentTitle: a.title,
                assignedToName: a.assignedTo?.name,
                assignedByName: a.assignedBy?.name,
                updatedAt: t.updatedAt || a.updatedAt || a.createdAt
              });
            });
          }
        });
        setRecentLogs(flattenedLogs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5));
        
        setAllAssignments(assignmentsData);

      } catch (error) {
        console.error("Dashboard Sync Error:", error);
        toast.error("Metrics synchronization failed");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allAssignments.length === 0) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const data = days.map((day, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index + (graphRange === "last" ? -7 : 0));
      const dateStr = targetDate.toISOString().split('T')[0];

      let assigned = 0;
      let completed = 0;

      allAssignments.forEach((a: any) => {
        const aDate = typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt).toISOString();
        if (aDate.startsWith(dateStr)) {
          assigned += (a.totalTasks || (a.tasks?.length || 0));
        }
        if (a.tasks) {
          a.tasks.forEach((t: any) => {
            if (t.completedAt) {
              const cDate = typeof t.completedAt === 'string' ? t.completedAt : new Date(t.completedAt).toISOString();
              if (cDate.startsWith(dateStr)) completed += 1;
            }
          });
        }
      });

      return { name: day, assigned, completed };
    });
    setWeeklyData(data);
  }, [allAssignments, graphRange]);

  if (isLoading) {
    return (
      <AppShell role="admin" title="Operations Control">
        <DashboardSkeleton />
      </AppShell>
    );
  }


  return (
    <>
    <AppShell role="admin" title="Operations Control">
      <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12 pb-24">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-4">
              {getGreeting()}, {user?.name} <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-3">Orchestrating excellence • Leading with strategic execution</p>
          </div>
          <div className="flex items-center gap-4">
             <Button
               onClick={() => setIsMicroTaskModalOpen(true)}
               variant="outline"
               className="h-12 px-6 rounded-2xl border-zinc-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] hover:border-zinc-900 hover:bg-zinc-950 hover:text-white transition-all gap-2"
             >
               <SendHorizonal className="h-4 w-4" /> Submit a Task
             </Button>
             <Button asChild variant="outline" className="h-12 px-6 rounded-2xl border-zinc-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                <Link to="/admin/today">Live Feed</Link>
             </Button>
             <Button asChild className="h-12 px-8 rounded-2xl bg-zinc-950 text-white shadow-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                <Link to="/admin/tasks"><Plus className="mr-2 h-4 w-4" /> Delegate New Bundle</Link>
             </Button>
          </div>
        </header>

        {/* METRICS GRID */}
        <div className="grid lg:grid-cols-2 gap-10">
          
          {/* SECTION 1: TEAM DELEGATION (ASSIGNED BY ME) */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] px-2 flex items-center gap-3">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Team Delegation Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               {[
                 { label: "Total Assigned", value: byAdminStats.total, icon: Layers, bg: "bg-zinc-50" },
                 { label: "Total Completed", value: byAdminStats.completed, icon: CheckCircle2, bg: "bg-emerald-50/30" },
                 { label: "Total Pending", value: byAdminStats.pending, icon: Clock, bg: "bg-amber-50/30" },
                 { label: "Assigned Today", value: byAdminStats.todayTotal, icon: Plus, bg: "bg-zinc-50" },
                 { label: "Completed Today", value: byAdminStats.todayCompleted, icon: CheckCircle2, bg: "bg-emerald-50/30" },
                 { label: "Pending Today", value: byAdminStats.todayPending, icon: Clock, bg: "bg-amber-50/30" }
               ].map((s, i) => (
                 <div key={i} className={cn("p-7 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all", s.bg)}>
                    <div className="flex items-center justify-between mb-3">
                       <s.icon className="h-4 w-4 text-zinc-400" />
                       <span className="text-2xl font-black tracking-tighter"><CountUp value={s.value} /></span>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                 </div>
               ))}
            </div>
          </section>

          {/* SECTION 2: MY TASKLOAD (ASSIGNED TO ME) */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] px-2 flex items-center gap-3">
              <ArrowDownCircle className="h-4 w-4 text-blue-500" /> My Operational Taskload
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               {[
                 { label: "Total Tasks", value: toAdminStats.total, icon: Briefcase, bg: "bg-zinc-50" },
                 { label: "Total Completed", value: toAdminStats.completed, icon: CheckCircle2, bg: "bg-emerald-50/30" },
                 { label: "Total Pending", value: toAdminStats.pending, icon: Clock, bg: "bg-amber-50/30" },
                 { label: "Incoming Today", value: toAdminStats.todayTotal, icon: Sparkles, bg: "bg-zinc-50" },
                 { label: "Completed Today", value: toAdminStats.todayCompleted, icon: CheckCircle2, bg: "bg-emerald-50/30" },
                 { label: "Pending Today", value: toAdminStats.todayPending, icon: Clock, bg: "bg-amber-50/30" }
               ].map((s, i) => (
                 <div key={i} className={cn("p-7 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all", s.bg)}>
                    <div className="flex items-center justify-between mb-3">
                       <s.icon className="h-4 w-4 text-zinc-400" />
                       <span className="text-2xl font-black tracking-tighter"><CountUp value={s.value} /></span>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                 </div>
               ))}
            </div>
          </section>
        </div>

        {/* WEEKLY TREND (FULL WIDTH) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-10 shadow-sm">
           <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="text-[13px] font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-[0.4em]">Overall Weekly Trend</h2>
                <p className="text-[11px] text-zinc-400 mt-2 uppercase font-bold tracking-widest">Delegated & Completed Task Velocity Across All Streams</p>
              </div>
              <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-100 self-start md:self-auto">
                <button 
                  onClick={() => setGraphRange("this")}
                  className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", graphRange === "this" ? "bg-white text-zinc-950 shadow-md" : "text-zinc-400 hover:text-zinc-600")}
                >
                  Current
                </button>
                <button 
                  onClick={() => setGraphRange("last")}
                  className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", graphRange === "last" ? "bg-white text-zinc-950 shadow-md" : "text-zinc-400 hover:text-zinc-600")}
                >
                  Previous
                </button>
              </div>
           </header>
           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#a1a1aa' }} dy={20} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#a1a1aa' }} />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 900 }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '30px', letterSpacing: '0.1em' }} />
                  <Line type="monotone" dataKey="assigned" name="Assigned" stroke="#71717a" strokeWidth={4} dot={{ r: 5, fill: '#71717a', strokeWidth: 3, stroke: '#fff' }} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* RECENT TASK LOGS (REPLACED PRIORITY ALERTS) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-12 shadow-sm">
           <header className="flex items-center justify-between mb-12">
              <h2 className="text-[13px] font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-[0.4em] flex items-center gap-3">
                <History className="h-5 w-5 text-zinc-400" /> Recent Task Activity
              </h2>
              <Button asChild variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-950">
                 <Link to="/admin/today">View All Logs <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
           </header>
           
           <div className="grid gap-6">
              {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 group hover:border-zinc-200 transition-all">
                   <div className="flex items-center gap-6">
                      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm", 
                        log.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 
                        log.status === 'in_progress' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'
                      )}>
                         {log.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div>
                         <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-50">{log.title}</p>
                         <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1 tracking-wider">
                           {log.assignmentTitle} • {log.assignedToName || 'Unassigned'}
                         </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">
                        {new Date(log.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">
                        {new Date(log.updatedAt).toLocaleDateString()}
                      </p>
                   </div>
                </div>
              )) : (
                <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[32px]">
                   <ClipboardList className="h-10 w-10 text-zinc-100 mx-auto mb-4" />
                   <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">No recent task activity recorded</p>
                </div>
              )}
           </div>
        </div>

      </div>
    </AppShell>

    {/* Submit Micro Task Modal */}
    <SubmitMicroTaskModal
      open={isMicroTaskModalOpen}
      onOpenChange={setIsMicroTaskModalOpen}
    />
  </>
  );
}