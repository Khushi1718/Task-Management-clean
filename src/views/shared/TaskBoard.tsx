import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { tasks, auth as authApi, admin, apiRequest, projects, getErrorMessage, files as fileApi } from "@/lib/api";

import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  Upload,
  FileText,
  X,
  Globe,
  PlayCircle,
  StopCircle,
  PlusCircle,
  Link,
  ExternalLink,
  File,
  Users,
  ShieldCheck,
  ArrowUpRight,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AssignmentDetails } from "@/components/AssignmentDetails";

export default function TaskBoard({ 
  role, 
  initialDate, 
  title: propTitle, 
  subtitle: propSubtitle, 
  hideTabs = false 
}: { 
  role: "master_admin" | "admin" | "employee",
  initialDate?: string,
  title?: string,
  subtitle?: string,
  hideTabs?: boolean
}) {
  const location = useLocation();
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [type, setType] = useState<"assigned_to_me" | "assigned_by_me" | "all">(
    (role === "employee" ? "assigned_to_me" : "assigned_by_me")
  );
  const [filterDate, setFilterDate] = useState<string>(initialDate || "");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // New Assignment Form State
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    assignedTo: "",
    projectId: "",
    tasks: [{ title: "", description: "", deadline: "", priority: "medium" }]
  });
  
  // View State
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [evidenceData, setEvidenceData] = useState({
    completionRemarks: "",
    evidence: "",
    evidenceFiles: [] as any[]
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<any>(null);

  // Initialize filters based on URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aid = params.get('assignmentId');
    const pid = params.get('projectId');
    
    if (pid) setFilterProjectId(pid);
    
    if (aid) {
      setType("all");
      setFilterDate("");
    } else if (initialDate) {
      setFilterDate(initialDate);
      if (role !== "employee") setType("all");
    }
  }, [location.search, initialDate, role]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle deep linking to an assignment
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const assignmentId = params.get('assignmentId');
    
    if (assignmentId && activeTasks.length > 0) {
      const assignment = activeTasks.find(a => (a._id || a.id) === assignmentId);
      if (assignment) {
        // Only set if not already selected to avoid infinite loop
        if (!selectedAssignment || (selectedAssignment._id || selectedAssignment.id) !== assignmentId) {
          setSelectedAssignment(assignment);
          setIsTasksModalOpen(true);
        }
      } else if (type !== "all" || filterDate !== "") {
        // If not found, try clearing filters to find it
        setType("all");
        setFilterDate("");
      }
    }
  }, [location.search, activeTasks, type, filterDate, selectedAssignment]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await tasks.getAll(
        type, 
        undefined, 
        debouncedSearch, 
        filterDate, 
        filterDepartment === "all" ? undefined : filterDepartment,
        filterProjectId === "all" ? undefined : filterProjectId
      );
      if (res.success) {
        // Normalize "Development" to "Tech" in real-time
        const normalized = (res.data || []).map((assignment: any) => ({
          ...assignment,
          assignedTo: {
            ...assignment.assignedTo,
            team: assignment.assignedTo?.team === "Development" ? "Tech" : assignment.assignedTo?.team
          }
        }));
        setActiveTasks(normalized);
      }
    } catch (error) {
      console.error("GET /tasks error:", error);
      toast.error("Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  };  const fetchAssignmentTasks = async (assignmentId: string) => {
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

  const fetchUsers = async () => {
    try {
      const [usersRes, profileRes, projectsRes] = await Promise.all([
        role !== "employee" ? admin.getAllUsers(100, 0) : Promise.resolve({ success: true, data: [] }),
        authApi.getProfile(),
        projects.getAll()
      ]);
      
      if (profileRes.success) {
        setCurrentUser(profileRes.data);
      }

      if (projectsRes.success) {
        setAllProjects(projectsRes.data || []);
      }
      
      if (role !== "employee" && usersRes.success && profileRes.success) {
        const profile = profileRes.data;
        let allUsers = usersRes.data || [];
        
        // Normalize "Development" to "Tech" in real-time
        let filtered = allUsers.map((u: any) => ({
          ...u,
          team: u.team === "Development" ? "Tech" : u.team
        })).filter((u: any) => (u.id || u._id) !== (profile.id || profile._id));
        
        if (role === "admin") {
          // Admins can only assign to Employees
          filtered = filtered.filter((u: any) => u.role === "employee");
        } else if (role === "master_admin") {
          // Superadmins can assign to Admins and Employees
          filtered = filtered.filter((u: any) => u.role === "admin" || u.role === "employee");
        }
        
        setUsers(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch users or profile", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [type, debouncedSearch, filterDate, filterDepartment, filterProjectId]);

  const handleCreateAssignment = async () => {
    if (!assignmentForm.title || !assignmentForm.assignedTo) {
      toast.error("Assignment title and assignee are required");
      return;
    }

    const validTasks = assignmentForm.tasks.filter(t => t.title.trim() && t.description.trim() && t.deadline);
    if (validTasks.length === 0) {
      toast.error("Please add at least one task with a title, description, and deadline");
      return;
    }

    try {
      const payload = {
        ...assignmentForm,
        projectId: assignmentForm.projectId === "none" ? undefined : assignmentForm.projectId,
        tasks: validTasks
      };
      console.log("Sending payload:", payload);
      const res = await tasks.create(payload);
      if (res.success) {
        toast.success("Assignment created successfully");
        setIsCreateModalOpen(false);
        fetchTasks();
        setAssignmentForm({
          title: "",
          assignedTo: "",
          projectId: "",
          tasks: [{ title: "", description: "", deadline: "", priority: "medium" }]
        });
        setAssigneeSearch("");
        setSelectedAssignee(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create assignment");
    }
  };

  const handleAddTaskRow = () => {
    setAssignmentForm({
      ...assignmentForm,
      tasks: [...assignmentForm.tasks, { title: "", description: "", deadline: "", priority: "medium" }]
    });
  };

  const handleUpdateTaskRow = (index: number, field: string, value: string) => {
    const newTasks = [...assignmentForm.tasks];
    (newTasks[index] as any)[field] = value;
    setAssignmentForm({ ...assignmentForm, tasks: newTasks });
  };

  const handleToggleTimer = async (taskId: string, currentAction: "start" | "stop") => {
    try {
      const res = await tasks.toggleTimer(taskId, currentAction);
      if (res.success) {

        toast.success(`Timer ${currentAction}ed`);
      }
    } catch (error: any) {
      toast.error(error.message || "Timer action failed");
    }
  };

  const handleSubmitEvidence = async () => {
    // All fields are optional now as per user request
    if (!evidenceData.completionRemarks && !evidenceData.evidence && evidenceData.evidenceFiles.length === 0) {
      toast.error("Please provide at least one form of evidence (remarks, link, or file)");
      return;
    }

    try {
      const res = await tasks.update(selectedTask._id, {
        status: "completed",
        ...evidenceData
      });
      if (res.success) {
        toast.success("Task completed successfully");
        setIsEvidenceModalOpen(false);
        setEvidenceData({ completionRemarks: "", evidence: "", evidenceFiles: [] });

        fetchTasks(); // Refresh assignment progress
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit evidence");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newFiles = [...evidenceData.evidenceFiles];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Actual upload call
        const res = await fileApi.upload(file);

        if (res.success) {
          newFiles.push(res.data);
        }
      }

      
      setEvidenceData({ ...evidenceData, evidenceFiles: newFiles });
      toast.success("Files uploaded successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "File upload failed"));
    } finally {
      setIsUploading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-destructive border-destructive/20 bg-destructive/5";
      case "medium": return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      case "low": return "text-blue-500 border-blue-500/20 bg-blue-500/5";
      default: return "";
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell 
      role={role}
      title={propTitle || "Task Board"}
      subtitle={propSubtitle || `${activeTasks.length} active assignment bundles in this view.`}
      actions={(role === "master_admin" || role === "admin") && (
        <Button onClick={() => setIsCreateModalOpen(true)} className="h-9 gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <PlusCircle className="h-4 w-4" /> Create Assignment
        </Button>
      )}
    >
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        {/* Create Assignment Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">New Assignment Bundle</DialogTitle>
                  <DialogDescription>Group multiple related tasks into one assignment</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignment Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Website Content Revamp" 
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})}
                    className="h-11 shadow-sm border-border/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignee" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign To</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Type name to search..." 
                      className="h-11 pl-9 shadow-sm border-border/50 focus:border-primary/50 transition-all"
                      value={assigneeSearch}
                      onChange={(e) => {
                        setAssigneeSearch(e.target.value);
                        setSelectedAssignee(null);
                        setAssignmentForm({ ...assignmentForm, assignedTo: "" });
                      }}
                    />
                    
                    <AnimatePresence>
                      {assigneeSearch && !selectedAssignee && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-border/50 shadow-2xl rounded-2xl overflow-hidden z-50 max-h-[200px] overflow-y-auto"
                        >
                          {users
                            .filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                            .length === 0 ? (
                              <div className="p-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">No members found</div>
                            ) : (
                              users
                                .filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                                .map(u => (
                                  <button
                                    key={u._id}
                                    onClick={() => {
                                      setSelectedAssignee(u);
                                      setAssigneeSearch(u.name);
                                      setAssignmentForm({ ...assignmentForm, assignedTo: u._id || u.id });
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/5 transition-colors text-left border-b border-border/10 last:border-0"
                                  >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                      {u.name[0]}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-foreground">{u.name}</p>
                                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{u.role} • {u.team}</p>
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
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link to Project (Optional)</Label>
                <Select value={assignmentForm.projectId} onValueChange={(v) => setAssignmentForm({...assignmentForm, projectId: v})}>
                  <SelectTrigger id="project" className="h-11 shadow-sm border-border/50">
                    <SelectValue placeholder="No Project Linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project Linked</SelectItem>
                    {allProjects.map(p => (
                      <SelectItem key={p._id} value={p._id}>
                        <span className="font-bold text-sm">{p.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task List</Label>
                  <Button variant="ghost" size="sm" onClick={handleAddTaskRow} className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-2 font-bold text-[10px] uppercase">
                    <Plus className="h-3.5 w-3.5" /> Add Task Row
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {assignmentForm.tasks.map((task, index) => (
                    <div key={index} className="p-4 rounded-xl border border-border/50 bg-accent/5 hover:bg-accent/10 transition-all group">
                      <div className="grid gap-3 sm:grid-cols-5">
                        <div className="sm:col-span-2">
                          <Input 
                            placeholder="Task Title" 
                            value={task.title}
                            onChange={(e) => handleUpdateTaskRow(index, 'title', e.target.value)}
                            className="h-9 text-xs border-none bg-background shadow-sm focus:ring-1"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <Input 
                            type="date"
                            value={task.deadline}
                            onChange={(e) => handleUpdateTaskRow(index, 'deadline', e.target.value)}
                            className="h-9 text-xs border-none bg-background shadow-sm focus:ring-1"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <Select value={task.priority} onValueChange={(v) => handleUpdateTaskRow(index, 'priority', v)}>
                            <SelectTrigger className="h-9 text-xs border-none bg-background shadow-sm focus:ring-1">
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setAssignmentForm({...assignmentForm, tasks: assignmentForm.tasks.filter((_, i) => i !== index)})}
                            disabled={assignmentForm.tasks.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="sm:col-span-5">
                          <textarea 
                            placeholder="Task Description"
                            value={task.description}
                            onChange={(e) => handleUpdateTaskRow(index, 'description', e.target.value)}
                            className="w-full min-h-[60px] p-2.5 rounded-lg text-xs bg-background border-none shadow-sm focus:ring-1 outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 bg-accent/5 border-t border-border/50">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateAssignment} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                Create Assignment Bundle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AssignmentDetails 
          isOpen={isTasksModalOpen}
          onClose={() => setIsTasksModalOpen(false)}
          assignment={selectedAssignment}
          currentUser={currentUser}
          onTaskUpdate={fetchTasks}
        />

        {/* Evidence Submission Modal */}
        <Dialog open={isEvidenceModalOpen} onOpenChange={setIsEvidenceModalOpen}>
          <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Submit Evidence</DialogTitle>
              <DialogDescription>Attach proof of completion for: <span className="font-bold text-foreground">{selectedTask?.title}</span></DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="remarks" className="text-xs font-bold uppercase text-muted-foreground">Completion Remarks (Optional)</Label>
                <textarea 
                  id="remarks" 
                  placeholder="What did you achieve? Any notes for the admin?" 
                  value={evidenceData.completionRemarks}
                  onChange={(e) => setEvidenceData({...evidenceData, completionRemarks: e.target.value})}
                  className="w-full min-h-[100px] p-3 rounded-xl bg-accent/5 border border-border/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all resize-none"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="evidence" className="text-xs font-bold uppercase text-muted-foreground">Evidence Link (Optional)</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    id="evidence" 
                    placeholder="https://github.com/..." 
                    value={evidenceData.evidence}
                    onChange={(e) => setEvidenceData({...evidenceData, evidence: e.target.value})}
                    className="pl-9 bg-accent/5 border-border/50 h-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Attachments (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {evidenceData.evidenceFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-primary/20">
                      <File className="h-3 w-3" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button onClick={() => setEvidenceData({...evidenceData, evidenceFiles: evidenceData.evidenceFiles.filter((_, i) => i !== idx)})} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-muted-foreground cursor-pointer text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border/50 transition-all">
                    {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    <span>{isUploading ? "Uploading..." : "Add Files"}</span>
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEvidenceModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitEvidence} className="bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20">
                Submit Completion Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-6">
          {!hideTabs && (
            <>
              {role === "admin" && (
                <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 shadow-sm">
                  <Button 
                    variant={type === "assigned_to_me" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 rounded-md text-xs px-4 font-bold uppercase tracking-wider"
                    onClick={() => setType("assigned_to_me")}
                  >
                    My Assignments
                  </Button>
                  <Button 
                    variant={type === "assigned_by_me" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 rounded-md text-xs px-4 font-bold uppercase tracking-wider"
                    onClick={() => setType("assigned_by_me")}
                  >
                    Assigned By Me
                  </Button>
                  <Button 
                    variant={type === "all" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 rounded-md text-xs px-4 font-bold uppercase tracking-wider"
                    onClick={() => setType("all")}
                  >
                    Global View
                  </Button>
                </div>
              )}

              {role === "master_admin" && (
                <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 shadow-sm">
                  <Button 
                    variant={type === "assigned_by_me" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 rounded-md text-xs px-4 font-bold uppercase tracking-wider"
                    onClick={() => setType("assigned_by_me")}
                  >
                    Assigned By Me
                  </Button>
                  <Button 
                    variant={type === "all" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 rounded-md text-xs px-4 font-bold uppercase tracking-wider"
                    onClick={() => setType("all")}
                  >
                    Global View
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                className="pl-9 h-10 w-64 bg-background/50 border-border/50 shadow-sm focus:ring-1 focus:w-80 transition-all duration-300" 
                placeholder="Search by assignment, employee, or admin..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50 shadow-sm">
              <div className={cn("flex items-center gap-2 px-2", role !== "employee" && "border-r border-border/50")}>
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-bold uppercase outline-none focus:ring-0 w-24"
                />
                {filterDate && (
                  <button onClick={() => setFilterDate("")} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              {role !== "employee" && (
                <div className="flex items-center gap-2 px-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="h-8 w-28 border-none bg-transparent text-[11px] font-bold uppercase shadow-none focus:ring-0">
                      <SelectValue placeholder="DEPT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Depts</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Tech">Tech</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="SEO">SEO</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50 shadow-sm">
               <div className="flex items-center gap-2 px-2">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                    <SelectTrigger className="h-8 w-32 border-none bg-transparent text-[11px] font-bold uppercase shadow-none focus:ring-0">
                      <SelectValue placeholder="PROJECT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {allProjects.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="flex flex-col h-[40vh] items-center justify-center text-center p-8 bg-accent/5 rounded-3xl border-2 border-dashed border-border/50">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No assignments found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              {searchTerm ? "No results match your search" : "New assignments will appear here once created."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeTasks.map((assignment: any) => (
              <Card key={assignment._id} className="group overflow-hidden border-none shadow-premium bg-background hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className={cn("h-1.5 w-full", 
                  assignment.priority === 'high' ? 'bg-destructive' : 
                  assignment.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                )} />
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-widest px-2", getPriorityColor(assignment.priority))}>
                      {assignment.priority}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{assignment.title}</CardTitle>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 pb-2 border-b border-border/30">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned By</p>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                          {assignment.assignedBy.name[0]}
                        </div>
                        <span className="text-xs font-semibold truncate">{assignment.assignedBy.name}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned To</p>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {assignment.assignedTo.name[0]}
                        </div>
                        <span className="text-xs font-semibold truncate">{assignment.assignedTo.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Progress</span>
                      <span>{Math.round(assignment.progress)}%</span>
                    </div>
                    <Progress value={assignment.progress} className="h-2 bg-accent/50" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-accent/5 border border-border/50 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total</p>
                      <p className="text-sm font-bold">{assignment.totalTasks}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                      <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Done</p>
                      <p className="text-sm font-bold text-green-600">{assignment.completedTasks}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Pending</p>
                      <p className="text-sm font-bold text-amber-600">{assignment.pendingTasks}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                     <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-4 rounded-xl gap-2 font-bold text-[11px] uppercase tracking-wider hover:bg-primary hover:text-white transition-all border border-transparent hover:border-primary"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        fetchAssignmentTasks(assignment._id);
                        setIsTasksModalOpen(true);
                      }}
                    >
                      View Bundle <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
