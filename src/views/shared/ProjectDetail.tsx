import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { auth, projects, tasks, admin } from "@/lib/api";
import { 
  Briefcase, 
  Users, 
  Plus, 
  ChevronRight, 
  MoreVertical,
  CheckCircle2,
  Clock,
  Zap,
  Layout,
  Search,
  Filter,
  ArrowLeft,
  Settings,
  UserPlus,
  Trash2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useParams, useNavigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export default function ProjectDetailView({ role }: { role: "master_admin" | "admin" | "employee" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [bundles, setBundles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projRes, tasksRes, profileRes] = await Promise.all([
        projects.getById(id!),
        tasks.getAll("all", undefined, undefined, undefined, undefined, id!),
        auth.getProfile()
      ]);

      if (profileRes.success) setCurrentUser(profileRes.data);

      if (projRes.success) setProject(projRes.data);
      if (tasksRes.success) setBundles(tasksRes.data || []);

      if (role === "master_admin" || role === "admin") {
        const usersRes = await admin.getAllUsers();
        if (usersRes.success) {
          let users = usersRes.data || [];
          if (role === "admin") {
            users = users.filter((u: any) => u.role === "employee");
          }
          setAllUsers(users);
        }
      }
    } catch (err) {
      toast.error("Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    if (project.members.some((m: any) => m._id === selectedUserId)) {
      toast.error("User is already a member");
      return;
    }

    try {
      const updatedMembers = [...project.members.map((m: any) => m._id), selectedUserId];
      const res = await projects.update(id!, { members: updatedMembers });
      if (res.success) {
        toast.success("Member added to project");
        setShowAddMember(false);
        setSelectedUserId(null);
        setMemberSearch("");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const updatedMembers = project.members.filter((m: any) => m._id !== userId).map((m: any) => m._id);
      const res = await projects.update(id!, { members: updatedMembers });
      if (res.success) {
        toast.success("Member removed");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  if (isLoading && !project) return <AppShell role={role}><div className="p-20 text-center"><Zap className="h-8 w-8 animate-pulse mx-auto text-zinc-300" /></div></AppShell>;
  if (!project) return <AppShell role={role}><div className="p-20 text-center">Project not found</div></AppShell>;

  return (
    <AppShell role={role}>
      <div className="max-w-[1300px] mx-auto py-10 px-6 space-y-12">
        {/* REFINED HEADER SECTION */}
        <header className="space-y-6">
          <button 
            onClick={() => navigate(`/${role.replace("_", "-")}/projects`)}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-blue-600 transition-all"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
            Workspace Root / Projects
          </button>
          
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900 uppercase leading-[0.9]">
              {project.name}
            </h1>
            <div className="h-1 w-20 bg-blue-600 rounded-full" />
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* MAIN STAGE: BUNDLES (Left/Center) */}
          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3">
                <Layout className="h-4 w-4 text-blue-500" /> Operational Streams
              </h3>
            </div>
            
            {(() => {
              const filteredBundles = bundles.filter(b => {
                if (role === "master_admin" || role === "admin") return true;
                return b.assignedTo?._id === currentUser?.id;
              });

              if (filteredBundles.length === 0) {
                return (
                  <div className="py-24 text-center rounded-[40px] border border-dashed border-zinc-200 bg-zinc-50/30 flex flex-col items-center gap-6 group hover:border-blue-200 transition-all">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Briefcase className="h-8 w-8 text-zinc-200 group-hover:text-blue-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Awaiting Initiatives</p>
                      <p className="text-[10px] text-zinc-400 italic">No operational bundles have been deployed to this project node yet.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid gap-4">
                  {filteredBundles.map((bundle, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={bundle._id}
                    >
                      <Link 
                        to={`/${role.replace("_", "-")}/tasks?assignmentId=${bundle._id}`}
                        className="group flex items-center justify-between p-6 rounded-3xl bg-white border border-zinc-100 shadow-sm hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all"
                      >
                        <div className="flex items-center gap-6">
                           <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm",
                            bundle.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          )}>
                            {bundle.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                          </div>
                          <div>
                            <h4 className="font-black tracking-tight uppercase text-[13px] text-zinc-900 group-hover:text-blue-600 transition-colors">{bundle.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Exec: {bundle.assignedTo?.name}</span>
                              <span className="h-0.5 w-0.5 rounded-full bg-zinc-200" />
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{bundle.tasks?.length || 0} Sequences</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* SIDE PANEL: INTELLIGENCE (Right) */}
          <div className="lg:col-span-4 space-y-12">
            {/* CORE DESCRIPTION */}
            <div className="space-y-4">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Briefing</h3>
               <p className="text-sm font-medium text-zinc-500 leading-relaxed italic">
                 {project.description || "Strategic objective parameters pending finalization."}
               </p>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-zinc-100 shadow-sm">
                <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-1">Streams</p>
                <p className="text-2xl font-black text-zinc-900 tracking-tighter">{bundles.length}</p>
              </div>
              <div className="p-6 rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-100">
                <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Personnel</p>
                <p className="text-2xl font-black tracking-tighter">{project.members.length}</p>
              </div>
            </div>

            {/* TEAM ROSTER */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3">
                  <Users className="h-4 w-4 text-blue-500" /> Stakeholders
                </h3>
                {(role === "master_admin" || (role === "admin" && project.members.some((m: any) => m._id === currentUser?.id))) && (
                   <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                     <DialogTrigger asChild>
                       <button className="text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest flex items-center gap-1.5">
                         <Plus className="h-3 w-3" /> Recruit
                       </button>
                     </DialogTrigger>
                     <DialogContent className="rounded-[40px] p-8 border-none shadow-2xl">
                       <DialogHeader>
                         <DialogTitle className="text-2xl font-black uppercase tracking-tight">Recruit Stakeholder</DialogTitle>
                       </DialogHeader>
                       <div className="py-8 space-y-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Collaborator Identity</label>
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                              <Input 
                                placeholder="Scan database for name..." 
                                className="h-14 pl-12 rounded-3xl border-zinc-100 text-sm font-bold shadow-sm focus:ring-blue-600"
                                value={memberSearch}
                                onChange={e => {
                                  setMemberSearch(e.target.value);
                                  setSelectedUserId(null);
                                }}
                              />
                              <AnimatePresence>
                                {memberSearch && !selectedUserId && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-3 bg-white border border-zinc-50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden z-50 max-h-[250px] overflow-y-auto"
                                  >
                                    {allUsers
                                      .filter(u => !project.members.some((m:any) => m._id === u._id))
                                      .filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                                      .length === 0 ? (
                                        <div className="p-6 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">No match found</div>
                                      ) : (
                                        allUsers
                                          .filter(u => !project.members.some((m:any) => m._id === u._id))
                                          .filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                                          .map(u => (
                                            <button
                                              key={u._id}
                                              onClick={() => {
                                                setSelectedUserId(u._id);
                                                setMemberSearch(u.name);
                                              }}
                                              className="w-full flex items-center gap-4 p-5 hover:bg-zinc-50 transition-colors text-left border-b border-zinc-50 last:border-0"
                                            >
                                              <Avatar className="h-10 w-10 shadow-sm">
                                                <AvatarFallback className="text-[11px] font-black bg-blue-50 text-blue-600">{u.name[0]}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="text-xs font-black text-zinc-900">{u.name}</p>
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{u.role} • {u.team}</p>
                                              </div>
                                            </button>
                                          ))
                                      )
                                    }
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          {selectedUserId && (
                             <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-100 flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                                   <UserPlus className="h-5 w-5" />
                                </div>
                                <p className="text-xs font-black text-zinc-900 tracking-tight uppercase">Ready to recruit <span className="text-blue-600">{memberSearch}</span></p>
                             </div>
                          )}
                       </div>
                       <DialogFooter>
                         <Button variant="ghost" onClick={() => setShowAddMember(false)} className="rounded-2xl h-14 font-black uppercase text-[10px] tracking-[0.2em]">Abort</Button>
                         <Button onClick={handleAddMember} className="rounded-2xl h-14 px-10 bg-blue-600 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100">Confirm Recruitment</Button>
                       </DialogFooter>
                     </DialogContent>
                   </Dialog>
                )}
              </div>
              
              <div className="grid gap-3">
                {project.members.map((member: any) => (
                  <div key={member._id} className="flex items-center justify-between p-4 rounded-3xl bg-white border border-zinc-50 hover:border-blue-100 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 shadow-sm border-2 border-white group-hover:border-blue-50 transition-all">
                        <AvatarFallback className="bg-blue-50 text-blue-600 text-[11px] font-black uppercase">
                          {member.name.split(" ").map((n:any) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-zinc-900 truncate uppercase group-hover:text-blue-600 transition-colors">{member.name}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link 
                        to={`/${role.replace("_", "-")}/users/${member._id}?projectId=${id}`}
                        className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                         <ExternalLink className="h-3 w-3" />
                      </Link>
                      {(role === "master_admin" || (role === "admin" && project.members.some((m: any) => m._id === currentUser?.id) && member.role === "employee")) && member._id !== project.createdBy?._id && (
                        <button 
                          onClick={() => handleRemoveMember(member._id)}
                          className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
