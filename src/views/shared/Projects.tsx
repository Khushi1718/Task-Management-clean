import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { auth, projects, admin } from "@/lib/api";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Users, 
  Calendar,
  ChevronRight,
  MoreVertical,
  Layout,
  ExternalLink,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ProjectsView({ role }: { role: "master_admin" | "admin" | "employee" }) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", members: [] as string[] });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [projRes, usersRes] = await Promise.all([
        projects.getAll(),
        role === "master_admin" ? admin.getAllUsers(100, 0) : Promise.resolve({ success: true, data: [] })
      ]);
      if (projRes.success) setItems(projRes.data || []);
      if (usersRes.success) setAllUsers(usersRes.data || []);
    } catch (err: any) {
      console.error("Project Fetch Error:", err);
      toast.error(err.message || "Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreate = async () => {
    if (!newProject.name) {
      toast.error("Project name is required");
      return;
    }
    try {
      const res = await projects.create(newProject);
      if (res.success) {
        toast.success("Project created successfully");
        setShowCreate(false);
        setNewProject({ name: "", description: "", members: [] });
        setMemberSearch("");
        fetchInitialData();
      }
    } catch (err) {
      toast.error("Failed to create project");
    }
  };

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell role={role}>
      <div className="max-w-7xl mx-auto space-y-10 py-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Enterprise Projects</h1>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-2">Strategic Initiative Management • Resource Alignment</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search projects..." 
                className="pl-11 h-12 w-[300px] rounded-2xl border-zinc-200 bg-white shadow-sm text-xs font-medium focus:ring-zinc-950"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {role === "master_admin" && (
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="h-12 px-6 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 hover:scale-[1.02] hover:bg-blue-700 transition-all text-xs font-black uppercase tracking-widest">
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[32px] border-none shadow-2xl p-8">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Initiate Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project Identity</label>
                      <Input 
                        placeholder="e.g. Project Quantum" 
                        value={newProject.name}
                        onChange={e => setNewProject({...newProject, name: e.target.value})}
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Executive Summary (Optional)</label>
                      <textarea 
                        className="w-full min-h-[100px] rounded-xl border border-zinc-200 p-4 text-sm focus:ring-1 focus:ring-zinc-950 outline-none transition-all resize-none"
                        placeholder="Define the scope and objectives..."
                        value={newProject.description}
                        onChange={e => setNewProject({...newProject, description: e.target.value})}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Add Team Members</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <Input 
                            placeholder="Search by name or team..." 
                            className="h-10 pl-9 rounded-xl border-zinc-200 text-xs font-medium"
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="max-h-[150px] overflow-y-auto space-y-2 p-1">
                        {allUsers.filter(u => 
                          u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                          u.team.toLowerCase().includes(memberSearch.toLowerCase())
                        ).length === 0 ? (
                          <p className="text-[10px] text-zinc-400 italic py-2">No matching members found.</p>
                        ) : (
                          allUsers.filter(u => 
                            u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                            u.team.toLowerCase().includes(memberSearch.toLowerCase())
                          ).map(u => (
                            <div key={u._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100">
                              <input 
                                type="checkbox"
                                id={`user-${u._id}`}
                                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                                checked={newProject.members.includes(u._id)}
                                onChange={(e) => {
                                  const members = e.target.checked 
                                    ? [...newProject.members, u._id]
                                    : newProject.members.filter(id => id !== u._id);
                                  setNewProject({...newProject, members});
                                }}
                              />
                              <label htmlFor={`user-${u._id}`} className="flex-1 cursor-pointer">
                                <p className="text-xs font-black text-zinc-900">{u.name}</p>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{u.role} • {u.team}</p>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl h-12">Cancel</Button>
                    <Button onClick={handleCreate} className="rounded-xl h-12 bg-zinc-950 text-white px-8">Launch Project</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* PROJECTS LIST */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 rounded-lg bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-4 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/30">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto border border-zinc-100 shadow-sm">
              <Briefcase className="h-8 w-8 text-zinc-200" />
            </div>
            <p className="text-zinc-400 font-medium italic">No projects found.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((project, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={project._id}
              >
                <Link 
                  to={`/${role.replace("_", "-")}/projects/${project._id}`}
                  className="group flex items-center justify-between p-5 rounded-xl bg-white border border-zinc-200 shadow-sm hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50 transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{project.name}</h3>
                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100">
                          Active
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium line-clamp-1 mt-0.5 group-hover:text-zinc-600 transition-colors">
                        {project.description || "No summary provided for this project."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden lg:flex flex-col items-end gap-0.5 px-6 border-r border-zinc-100">
                      <span className="text-[9px] font-bold uppercase text-zinc-300 tracking-wider">Stakeholders</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 group-hover:text-blue-600 transition-colors">
                         <Users className="h-3 w-3" />
                         <span>{project.members?.length || 0} Members</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-0.5 px-6 border-r border-zinc-100">
                      <span className="text-[9px] font-bold uppercase text-zinc-300 tracking-wider">Established</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 group-hover:text-blue-400 transition-colors">
                         <Calendar className="h-3 w-3" />
                         <span>{new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-blue-200">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
