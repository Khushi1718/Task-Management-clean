import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { auth, tasks, admin, adminMicroTasks } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { cn } from "@/lib/utils";


import { 
  Users, 
  CheckCircle2, 
  TrendingUp,
  Loader2,
  PlusCircle,
  Zap,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  ClipboardList,
  Target,
  ArrowRight,
  Shield,
  Briefcase,
  AlertTriangle,
  LineChart as LineChartIcon,
  Calendar,
  Clock,
  Layout,
  Layers,
  ArrowDownRight,
  Monitor,
  Globe,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, animate } from "framer-motion";

// CountUp Component for "Increasing Digits"
function CountUp({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
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

export default function MasterAdminDashboard() {
  const { user: storeUser } = useAuthStore();
  const [user, setUser] = useState<any>(storeUser);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [graphRange, setGraphRange] = useState<"this" | "last">("this");

  // Detailed Stats
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    todayTotal: 0,
    todayCompleted: 0,
    todayPending: 0,
    todayOverdue: 0,
    usersTotal: 0,
    adminsCount: 0,
    employeesOnline: 0
  });

  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [adminsPerformance, setAdminsPerformance] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Parallelize all major data fetching
        const tasksPromise = tasks.getAll("all");
        const microTasksPromise = adminMicroTasks.getAll(100, 0, "all");
        const usersPromise = admin.getAllUsers();
        const profilePromise = !storeUser ? auth.getProfile() : Promise.resolve({ success: true, data: storeUser });

        const [profileRes, tasksRes, usersRes, microTasksRes] = await Promise.all([
          profilePromise,
          tasksPromise,
          usersPromise,
          microTasksPromise
        ]);

        if (profileRes.success) setUser(profileRes.data);

        
        let assignmentsData = tasksRes.data || [];
        
        // Merge micro-tasks
        if (microTasksRes.success && microTasksRes.data) {
          const normalizedMicro = microTasksRes.data.map((mt: any) => ({
            ...mt,
            isMicroTask: true,
            status: mt.status === "acknowledged" ? "completed" : "pending",
            createdAt: mt.submittedAt,
            progress: 100,
            totalTasks: 1,
            completedTasks: 1,
            pendingTasks: 0,
            tasks: [{
              title: mt.title,
              description: mt.description,
              status: mt.status === "acknowledged" ? "completed" : "pending",
              completedAt: mt.status === "acknowledged" ? mt.submittedAt : null,
              timeSpent: (mt.timeSpent || 0) * 60,
              taskDate: mt.taskDate
            }]
          }));
          assignmentsData = [...assignmentsData, ...normalizedMicro];
        }
        const usersData = usersRes.data || [];
        
        setAllAssignments(assignmentsData);
        setAllUsers(usersData);

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // FLATTEN ALL TASKS FROM ALL BUNDLES
        const flattenedTasks: any[] = [];
        assignmentsData.forEach((a: any) => {
          if (a.tasks && Array.isArray(a.tasks)) {
            a.tasks.forEach((t: any) => {
              flattenedTasks.push({
                ...t,
                createdAt: a.createdAt, // Assignment creation date
                assignedTo: a.assignedTo,
                assignedBy: a.assignedBy
              });
            });
          }
        });

        const totalTasksCount = flattenedTasks.length;
        const activeTasksCount = flattenedTasks.filter((t: any) => t.status === "in_progress").length;
        const completedTasksCount = flattenedTasks.filter((t: any) => t.status === "completed").length;
        const pendingTasksCount = flattenedTasks.filter((t: any) => t.status === "pending").length;

        const todayTasks = flattenedTasks.filter((t: any) => new Date(t.createdAt).toDateString() === now.toDateString());
        const todayCompleted = todayTasks.filter((t: any) => t.status === "completed" && t.completedAt && new Date(t.completedAt).toDateString() === now.toDateString()).length;

        const todayOverdue = flattenedTasks.filter((t: any) => t.status !== "completed" && new Date(t.deadline) < now).length;

        setStats({
          totalTasks: totalTasksCount,
          activeTasks: activeTasksCount,
          completedTasks: completedTasksCount,
          pendingTasks: pendingTasksCount,
          todayTotal: todayTasks.length,
          todayCompleted,
          todayPending: todayTasks.length - todayCompleted,
          todayOverdue,
          usersTotal: usersData.length,
          adminsCount: usersData.filter((u: any) => u.role === "admin").length,
          employeesOnline: usersData.filter((u: any) => u.isActive && u.role === "employee").length
        });

        // Collect unique teams/departments from users
        const teamSet = new Set<string>();
        usersData.forEach((u: any) => {
          if (!u.team) return;
          let t = u.team.trim();
          // Normalize to Title Case to avoid duplicates like "SEO" and "seo"
          t = t.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          teamSet.add(t);
        });
        
        const teams = Array.from(teamSet).sort().slice(0, 8);
        setAvailableTeams(teams);

        // Admin Performance
        const adminUsers = usersData.filter((u: any) => u.role === "admin");
        const adminPerf = adminUsers.map((adm: any) => {
          const admTasks = flattenedTasks.filter((t: any) => t.assignedBy?._id === adm._id || t.assignedBy === adm._id);
          return {
            id: adm._id,
            name: adm.name,
            email: adm.email,
            assigned: admTasks.length,
            completed: admTasks.filter((t: any) => t.status === "completed").length,
            pending: admTasks.filter((t: any) => t.status !== "completed").length
          };
        }).sort((a, b) => b.assigned - a.assigned);
        setAdminsPerformance(adminPerf);

      } catch (error) {
        toast.error("Failed to sync dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allAssignments.length === 0) return;

    // Weekly Graph Data - Robust calculation
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    
    // Get the Monday of the current week
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const data = days.map((day, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index + (graphRange === "last" ? -7 : 0));
      const dateStr = targetDate.toISOString().split('T')[0];

      // Count tasks in assignments created on this day
      let assigned = 0;
      let completed = 0;

      allAssignments.forEach((a: any) => {
        const aDate = typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt).toISOString();
        if (aDate.startsWith(dateStr) && a.tasks) {
          assigned += a.tasks.length;
        }
        if (a.tasks) {
          a.tasks.forEach((t: any) => {
            if (t.completedAt) {
              const cDate = typeof t.completedAt === 'string' ? t.completedAt : new Date(t.completedAt).toISOString();
              if (cDate.startsWith(dateStr)) {
                completed += 1;
              }
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
      <AppShell role="master_admin" title="Global Overview">
        <DashboardSkeleton />
      </AppShell>
    );
  }


  return (
    <AppShell role="master_admin" title="Global Overview">
      <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12 pb-24">
        
        {/* DYNAMIC GREETING HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-4">
              {getGreeting()}, {user?.name} <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-3">Enterprise Workforce Management • Real-time Task Velocity</p>
          </div>
          <div className="flex items-center gap-4">
             <Button asChild variant="outline" className="h-12 px-6 rounded-2xl border-zinc-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                <Link to="/master-admin/tasks">All Bundles</Link>
             </Button>
             <Button asChild className="h-12 px-8 rounded-2xl bg-zinc-950 text-white shadow-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                <Link to="/master-admin/tasks"><PlusCircle className="mr-2 h-4 w-4" /> Create New Work</Link>
             </Button>
          </div>
        </header>

        {/* REFINED KPI GRID WITH COUNT-UP */}
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Lifecycle Overview */}
          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Task Distribution
            </h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: "Total Tasks", value: stats.totalTasks, icon: Briefcase, color: "text-zinc-900", bg: "bg-zinc-50" },
                { label: "Active Now", value: stats.activeTasks, icon: Zap, color: "text-blue-500", bg: "bg-blue-50/30" },
                { label: "Finished", value: stats.completedTasks, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50/30" },
                { label: "Pending", value: stats.pendingTasks, icon: Clock, color: "text-amber-500", bg: "bg-amber-50/30" }
              ].map((s, i) => (
                <div key={i} className={cn("p-7 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group", s.bg)}>
                  <div className="flex items-center justify-between mb-4">
                    <s.icon className={cn("h-5 w-5", s.color)} />
                    <span className="text-2xl font-black tracking-tighter"><CountUp value={s.value} /></span>
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Pulse */}
          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Today's Statistics
            </h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: "Today Total", value: stats.todayTotal, icon: Activity, color: "text-zinc-900", bg: "bg-zinc-50" },
                { label: "Today Done", value: stats.todayCompleted, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50/30" },
                { label: "Today Pending", value: stats.todayPending, icon: Clock, color: "text-zinc-400", bg: "bg-zinc-50" },
                { label: "Deadlines Missed", value: stats.todayOverdue, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50/30" }
              ].map((s, i) => (
                <div key={i} className={cn("p-7 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group", s.bg)}>
                  <div className="flex items-center justify-between mb-4">
                    <s.icon className={cn("h-5 w-5", s.color)} />
                    <span className="text-2xl font-black tracking-tighter"><CountUp value={s.value} /></span>
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personnel Node */}
          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Workforce Node
            </h3>
            <div className="grid grid-cols-2 gap-5 h-full">
              {[
                { label: "Total Staff", value: stats.usersTotal, icon: Users, color: "text-zinc-900", bg: "bg-zinc-50" },
                { label: "Admins", value: stats.adminsCount, icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50/30" },
                { label: "Active Work Bundles", value: allAssignments.length, icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50/30", full: true }
              ].map((s, i) => (
                <div key={i} className={cn("p-7 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all", s.bg, s.full && "col-span-2")}>
                  <div className="flex items-center justify-between mb-4">
                    <s.icon className={cn("h-5 w-5", s.color)} />
                    <span className="text-2xl font-black tracking-tighter"><CountUp value={s.value} /></span>
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-8 space-y-12">
            {/* WEEKLY PERFORMANCE GRAPH */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-10 shadow-sm">
               <header className="flex items-center justify-between mb-12">
                  <div>
                    <h2 className="text-[13px] font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-[0.4em]">Weekly Work Report</h2>
                    <p className="text-[11px] text-zinc-400 mt-2 uppercase font-bold tracking-widest">Tasks assigned vs tasks completed per day</p>
                  </div>
                  <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-100">
                    <button 
                      onClick={() => setGraphRange("this")}
                      className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", graphRange === "this" ? "bg-white text-zinc-950 shadow-md" : "text-zinc-400 hover:text-zinc-600")}
                    >
                      Current
                    </button>
                    <button 
                      onClick={() => setGraphRange("last")}
                      className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", graphRange === "last" ? "bg-white text-zinc-950 shadow-md" : "text-zinc-400 hover:text-zinc-600")}
                    >
                      Previous
                    </button>
                  </div>
               </header>
               <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#a1a1aa' }} dy={20} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#a1a1aa' }} />
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '30px', letterSpacing: '0.1em' }} />
                      <Line type="monotone" dataKey="assigned" name="Tasks Assigned" stroke="#18181b" strokeWidth={4} dot={{ r: 5, fill: '#18181b', strokeWidth: 3, stroke: '#fff' }} />
                      <Line type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* MANAGE TEAMS SECTION */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-10 shadow-sm">
               <h2 className="text-[13px] font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
                 <Monitor className="h-5 w-5 text-zinc-400" /> Manage Departments
               </h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link to="/master-admin/users?role=admin" className="flex flex-col items-center justify-center p-8 bg-zinc-950 text-white rounded-[32px] hover:scale-[1.03] transition-all shadow-xl group">
                    <Shield className="h-6 w-6 mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Admins</span>
                    <span className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-tighter text-center">Manage Admins</span>
                  </Link>

                  {availableTeams.map((team, i) => (
                    <Link key={i} to={`/master-admin/users?department=${team}`} className="flex flex-col items-center justify-center p-8 bg-zinc-50 hover:bg-zinc-100 rounded-[32px] border border-zinc-100 transition-all hover:scale-[1.03] group">
                      <Briefcase className={cn("h-6 w-6 mb-4 transition-transform group-hover:scale-110", i % 2 === 0 ? "text-amber-500" : "text-emerald-500")} />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 text-center truncate w-full px-2">{team}</span>
                      <span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter">View Members</span>
                    </Link>
                  ))}
               </div>
            </div>

          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4 space-y-10">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-12 shadow-sm">
               <h2 className="text-[13px] font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-[0.4em] mb-12">Latest Activity</h2>
               <div className="space-y-10">
                  {allAssignments.slice(0, 5).map((a, i) => (
                    <div key={i} className="group flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm", a.progress === 100 ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500")}>
                             <ClipboardList className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[14px] font-black text-zinc-950 truncate mb-1">{a.title}</p>
                             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{a.assignedTo?.name} • {Math.round(a.progress)}% Done</p>
                          </div>
                       </div>
                       <Link to="/master-admin/tasks" className="h-9 w-9 rounded-full bg-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <ArrowUpRight className="h-4 w-4" />
                       </Link>
                    </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
               <Link to="/master-admin/tasks" className="p-8 bg-zinc-950 text-white rounded-[40px] shadow-2xl group relative overflow-hidden">
                  <Activity className="absolute -bottom-8 -right-8 h-48 w-48 text-white/5 opacity-50 group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10">
                    <h4 className="text-lg font-black tracking-tight mb-2">Operational Board</h4>
                    <p className="text-[11px] text-white/40 font-medium leading-relaxed">Manage all bundles and track individual task progress.</p>
                  </div>
               </Link>
               <Link to="/master-admin/users" className="p-8 bg-white border border-zinc-100 rounded-[40px] shadow-sm group">
                  <h4 className="text-lg font-black tracking-tight mb-2 text-zinc-900">User Management</h4>
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">Oversee all admins and employees across departments.</p>
               </Link>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
