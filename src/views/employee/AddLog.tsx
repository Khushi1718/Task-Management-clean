import { useNavigate, useParams } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock, 
  UploadCloud, 
  X, 
  Link as LinkIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  PlusCircle,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Lock,
  Calendar,
  CheckSquare,
  Square,
  History,
  Send,
  Search
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { auth, getErrorMessage, workLogs, files as fileApi } from "@/lib/api";

import { Task, LogStatus, LogState, WorkLogAttachment, SeoData } from "@/lib/mock-data";

type WorkLogFormData = {
  title: string;
  meetingsAttended: string;
  focusForTomorrow: string;
  status: LogStatus;
  state: LogState;
  date: string;
  tasks: Task[];
  attachments: WorkLogAttachment[];
  seoData: SeoData;
  submittedAt?: string | Date;
  autoSubmittedAt?: string | Date;
};

export default function AddLog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [seoProofInput, setSeoProofInput] = useState("");
  const taskInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState<WorkLogFormData>({
    title: "",
    meetingsAttended: "0",
    focusForTomorrow: "",
    status: "pending" as LogStatus,
    state: "draft" as LogState,
    date: new Date().toISOString().slice(0, 10),
    tasks: [] as Task[],
    attachments: [] as WorkLogAttachment[],
    seoData: {
      questionsAnswered: 0,
      backlinksCreated: 0,
      proofs: [],
    },
  });
  const [dbId, setDbId] = useState<string | null>(null);
  const [isTodayLog, setIsTodayLog] = useState(true);
  const isSeoUser = currentUser?.role === "SEO" || currentUser?.team?.toLowerCase() === "seo";

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await auth.getProfile();
        if (res.success) setCurrentUser(res.data);
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const normalizeSeoData = (seoData?: Partial<SeoData>): SeoData => ({
      questionsAnswered: Number(seoData?.questionsAnswered) || 0,
      backlinksCreated: Number(seoData?.backlinksCreated) || 0,
      proofs: seoData?.proofs || [],
    });

    const loadLog = async (logId: string) => {
      try {
        setIsLoading(true);
        const res = await workLogs.getDetail(logId);
        if (res.success && res.data) {
          const logDate = new Date(res.data.date).toISOString().slice(0, 10);
          const todayDate = new Date().toISOString().slice(0, 10);
          setIsTodayLog(logDate === todayDate);

          setFormData({
            title: res.data.title || "",
            meetingsAttended: String(res.data.meetingsAttended || 0),
            focusForTomorrow: res.data.focusForTomorrow || "",
            status: res.data.status || "pending",
            state: res.data.state || "draft",
            date: logDate,
            tasks: res.data.tasks || [],
            attachments: res.data.attachments || [],
            seoData: normalizeSeoData(res.data.seoData),
          });
          setDbId(res.data._id || res.data.id);
        }
      } catch (e) {
        console.error("Error loading log:", e);
        toast.error("Failed to load work log");
      } finally {
        setIsLoading(false);
      }
    };

    const checkToday = async () => {
      try {
        setIsLoading(true);
        const res = await workLogs.getTodayLog();
        if (res.success && res.data) {
          setFormData({
            title: res.data.title || "",
            meetingsAttended: String(res.data.meetingsAttended || 0),
            focusForTomorrow: res.data.focusForTomorrow || "",
            status: res.data.status || "pending",
            state: res.data.state || "draft",
            date: new Date(res.data.date).toISOString().slice(0, 10),
            tasks: res.data.tasks || [],
            attachments: res.data.attachments || [],
            seoData: normalizeSeoData(res.data.seoData),
          });
          setDbId(res.data._id || res.data.id);
          setIsTodayLog(true);
        }
      } catch (e) {
        console.error("Error loading today's log:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const isEditMode = typeof window !== 'undefined' && window.location.pathname.includes('/logs/edit/');
    if (id && isEditMode) {
      loadLog(id);
    } else {
      checkToday();
    }
  }, [id]);

  const isLocked = formData.state === "submitted" || formData.state === "auto_submitted";

  // Auto-save functionality
  useEffect(() => {
    if (isLocked || !dbId || formData.tasks.length === 0) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        const payload = {
          ...formData,
          meetingsAttended: parseInt(formData.meetingsAttended) || 0,
          state: 'draft',
          status: formData.tasks.every(t => t.status === 'completed') ? 'completed' : 
                  formData.tasks.some(t => t.status !== 'pending') ? 'in_progress' : 'pending',
        };

        const res = await workLogs.update(dbId, payload);
        if (res.success) {
          // Broadcast update for real-time dashboard sync
          window.dispatchEvent(new CustomEvent("todayLogUpdated", { detail: res.data }));
          console.log("Auto-saved successfully");
        }
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [formData, dbId, isLocked]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isLocked) return;
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const addTask = () => {
    if (isLocked || !taskInput.trim()) return;
    const newTask: Task = {
      id: `task_${Date.now()}`,
      text: taskInput.trim(),
      status: "pending",
      priority: "medium",
      notes: ""
    };
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setTaskInput("");
    taskInputRef.current?.focus();
  };

  const removeTask = (taskId: string) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
  };

  const updateTaskField = (taskId: string, field: keyof Task, value: any) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
    }));
  };

  const addLink = () => {
    if (isLocked || !linkInput.trim()) return;
    const newAtt: WorkLogAttachment = {
      id: `att_${Date.now()}`,
      name: linkInput.split('/').pop() || 'Link',
      url: linkInput.trim(),
      type: "link"
    };
    setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
    setLinkInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const res = await fileApi.upload(file);
      if (res.success) {
        const newAtt: WorkLogAttachment = {
          id: res.data.id || `att_${Date.now()}`,
          name: res.data.name || file.name,
          url: res.data.url,
          type: file.name.endsWith(".xlsx") ? "spreadsheet" : file.name.endsWith(".pptx") ? "presentation" : "document"
        };
        setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
        toast.success("File uploaded successfully");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(getErrorMessage(error, "Failed to upload file"));
    } finally {
      setIsLoading(false);
    }
  };


  const updateAttachment = (attachmentId: string, field: keyof WorkLogAttachment, value: string) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).map(att =>
        att.id === attachmentId ? { ...att, [field]: value } : att
      ),
    }));
  };

  const removeAttachment = (attachmentId: string) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(att => att.id !== attachmentId),
    }));
  };

  const handleSeoNumberChange = (field: "questionsAnswered" | "backlinksCreated", value: string) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      seoData: {
        ...prev.seoData,
        [field]: Math.max(0, parseInt(value, 10) || 0),
      },
    }));
  };

  const addSeoProof = () => {
    if (isLocked || !seoProofInput.trim()) return;
    const url = seoProofInput.trim();
    const proof: WorkLogAttachment = {
      id: `seo_proof_${Date.now()}`,
      name: url.split("/").pop() || "SEO proof",
      url,
      type: "link",
    };
    setFormData(prev => ({
      ...prev,
      seoData: {
        ...prev.seoData,
        proofs: [...(prev.seoData.proofs || []), proof],
      },
    }));
    setSeoProofInput("");
  };

  const updateSeoProof = (proofId: string, field: keyof WorkLogAttachment, value: string) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      seoData: {
        ...prev.seoData,
        proofs: (prev.seoData.proofs || []).map(proof =>
          proof.id === proofId ? { ...proof, [field]: value } : proof
        ),
      },
    }));
  };

  const removeSeoProof = (proofId: string) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      seoData: {
        ...prev.seoData,
        proofs: (prev.seoData.proofs || []).filter(proof => proof.id !== proofId),
      },
    }));
  };

  const handleAction = async (action: 'draft' | 'submit') => {
    if (isLocked) return;
    if (!formData.title.trim()) return toast.error("Objective title is required.");
    if (formData.tasks.length === 0) return toast.error("Please add at least one task.");

    try {
      setIsLoading(true);
      const payload = {
        ...formData,
        meetingsAttended: parseInt(formData.meetingsAttended) || 0,
        state: action === 'submit' ? 'submitted' : 'draft',
        status: formData.tasks.every(t => t.status === 'completed') ? 'completed' : 
                formData.tasks.some(t => t.status !== 'pending') ? 'in_progress' : 'pending',
      };

      let res;
      if (dbId) {
        // First update the log
        res = await workLogs.update(dbId, payload);
        
        // If submitting, call the submit endpoint
        if (action === 'submit' && res.success) {
          res = await workLogs.submitLog(dbId);
        }
      } else {
        res = await workLogs.create(payload);
        if (res.success && res.data?.id) {
          const newId = res.data.id || res.data._id;
          setDbId(newId);
          
          // Update form state with new data
          setFormData(prev => ({
            ...prev,
            state: res.data.state || prev.state,
          }));
          
          // If user wants to submit immediately
          if (action === 'submit') {
            const submitRes = await workLogs.submitLog(newId);
            res = submitRes;
          }
        }
      }

      if (res.success) {
        const updatedLog = res.data;
        
        // Update form state with response data
        setFormData(prev => ({
          ...prev,
          state: updatedLog.state || prev.state,
        }));
        
        // Broadcast update event to dashboard
        window.dispatchEvent(new CustomEvent("todayLogUpdated", { detail: updatedLog }));
        
        const message = action === 'submit' ? "Log finalized and locked." : "Progress saved successfully.";
        toast.success(message);
        
        if (action === 'submit') {
          // Navigate after submission
          setTimeout(() => navigate("/employee/logs"), 1500);
        } else {
          // Auto-save successful - no page reload needed
          console.log("Draft saved successfully");
        }
      } else {
        toast.error(res.message || "Failed to save log.");
      }
    } catch (e: any) {
      console.error("Submission error:", e);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell role="employee" title={isTodayLog ? "Today's Log" : "Daily Work Log"} subtitle={isTodayLog ? "Your live to-do list for today." : "Record your tasks and accomplishments."}>
      <div className="max-w-6xl mx-auto">
        
        {/* Status & Auto-save Banner */}
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1 flex items-center gap-3">
            {isLocked ? (
              <>
                <ShieldCheck className="h-5 w-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Log Locked</p>
                  <p className="text-[10px] text-zinc-500 font-medium">This log was {formData.state === 'auto_submitted' ? 'automatically' : ''} submitted and cannot be edited.</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse shrink-0" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Draft Mode</p>
                  <p className="text-[10px] text-zinc-500 font-medium">{dbId ? 'Changes auto-save every 2 seconds' : 'Create or edit log to auto-save'}</p>
                </div>
              </>
            )}
          </div>
          {!isLocked && dbId && (
            <span className="text-[9px] font-bold text-success uppercase tracking-wider px-2 py-1 bg-success/10 rounded-full">✓ Auto-saving</span>
          )}
        </div>

        {/* Status Banner - Locked State */}
        {isLocked && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-zinc-900 text-white rounded-2xl border border-white/10 shadow-lg animate-in fade-in slide-in-from-top-2">
            <Lock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-bold">Log Record Locked</p>
              <p className="text-[11px] text-zinc-400">This log was {formData.state === 'auto_submitted' ? 'automatically' : ''} submitted at {new Date(formData.submittedAt || formData.autoSubmittedAt!).toLocaleString()}.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Title Section */}
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
              <div className="space-y-1">
                <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Main Objective</Label>
                <Input 
                  id="title" 
                  placeholder="Primary focus of the day..." 
                  readOnly={isLocked}
                  className="h-14 text-2xl font-bold border-none bg-transparent p-0 focus-visible:ring-0 placeholder:text-zinc-200"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* SEO Activity Section - For SEO Users Only (After Heading) */}
            {isSeoUser && (
              <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">SEO Activity</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="questionsAnswered" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      No. of Questions Answered
                    </Label>
                    <Input
                      id="questionsAnswered"
                      type="number"
                      min={0}
                      readOnly={isLocked}
                      value={formData.seoData.questionsAnswered}
                      onChange={(e) => handleSeoNumberChange("questionsAnswered", e.target.value)}
                      className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-100 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backlinksCreated" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      No. of Backlinks Created
                    </Label>
                    <Input
                      id="backlinksCreated"
                      type="number"
                      min={0}
                      readOnly={isLocked}
                      value={formData.seoData.backlinksCreated}
                      onChange={(e) => handleSeoNumberChange("backlinksCreated", e.target.value)}
                      className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-100 text-sm font-bold"
                    />
                  </div>
                </div>

                {!isLocked && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste link or URL..."
                      className="h-10 text-xs rounded-xl"
                      value={seoProofInput}
                      onChange={(e) => setSeoProofInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSeoProof())}
                    />
                    <Button type="button" size="sm" onClick={addSeoProof} className="h-10 px-3 rounded-xl">ADD</Button>
                  </div>
                )}

                <div className="space-y-2">
                  {formData.seoData.proofs && formData.seoData.proofs.length > 0 ? (
                    formData.seoData.proofs.map((proof) => (
                      <div key={proof.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50">
                        <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0 mt-3" />
                        <div className="min-w-0 flex-1 space-y-2">
                          {isLocked ? (
                            <>
                              <p className="truncate text-[11px] font-bold text-zinc-600">{proof.name}</p>
                              <p className="truncate text-[10px] text-zinc-400">{proof.url}</p>
                            </>
                          ) : (
                            <>
                              <Input
                                value={proof.name}
                                onChange={(e) => updateSeoProof(proof.id, "name", e.target.value)}
                                placeholder="Proof name"
                                className="h-9 rounded-lg bg-white text-[11px] font-bold"
                              />
                              <Input
                                value={proof.url}
                                onChange={(e) => updateSeoProof(proof.id, "url", e.target.value)}
                                placeholder="Proof URL"
                                className="h-9 rounded-lg bg-white text-[11px]"
                              />
                            </>
                          )}
                        </div>
                        {!isLocked && (
                          <button type="button" onClick={() => removeSeoProof(proof.id)} className="pt-3 text-zinc-300 hover:text-destructive">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    !isLocked && <p className="text-[10px] text-zinc-400 text-center py-2">No proofs added yet</p>
                  )}
                </div>
              </section>
            )}

            {/* Workflow Builder */}
            <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <header className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl"><CheckSquare className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Workflow Breakdown</h3>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-zinc-400">{formData.tasks.length} tasks</span>
                </div>
              </header>

              <div className="p-8 space-y-6">
                {!isLocked && (
                  <div className="relative group">
                    <Input
                      ref={taskInputRef}
                      placeholder="Add high-level task..."
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
                      className="h-14 pl-12 pr-12 rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-base"
                    />
                    <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300" />
                    <Button type="button" onClick={addTask} className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl"><Plus className="h-5 w-5" /></Button>
                  </div>
                )}

                <div className="space-y-6">
                  {formData.tasks.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-3xl">
                      <History className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
                      <p className="text-sm text-zinc-400 font-medium">No tasks defined for this session.</p>
                    </div>
                  ) : (
                    formData.tasks.map((task) => (
                      <div key={task.id} className="p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 group">
                        <div className="flex items-center gap-3 mb-4">
                          <Select 
                            value={task.status} 
                            onValueChange={(value) => updateTaskField(task.id, "status", value)}
                          >
                            <SelectTrigger className="w-auto h-8 px-3 border-none bg-white dark:bg-zinc-800 shadow-sm rounded-lg text-[10px] font-bold uppercase">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="completed" className="text-success font-bold">COMPLETED</SelectItem>
                              <SelectItem value="in_progress" className="text-primary font-bold">IN PROGRESS</SelectItem>
                              <SelectItem value="pending" className="text-zinc-400 font-bold">PENDING</SelectItem>
                            </SelectContent>
                          </Select>

                          <input 
                            value={task.text}
                            onChange={(e) => updateTaskField(task.id, "text", e.target.value)}
                            className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold text-zinc-800 dark:text-zinc-100 ${task.status === 'completed' ? 'line-through text-zinc-400' : ''}`}
                          />

                          {!isLocked && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(task.id)} className="h-8 w-8 text-zinc-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3 pl-2">
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Priority:</span>
                            <Select 
                              value={task.priority} 
                              onValueChange={(value) => updateTaskField(task.id, "priority", value)}
                            >
                              <SelectTrigger className="w-20 h-6 px-2 border-none bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">HIGH</SelectItem>
                                <SelectItem value="medium">MEDIUM</SelectItem>
                                <SelectItem value="low">LOW</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {task.notes !== undefined && (
                            <textarea 
                              placeholder="Add notes or details..." 
                              readOnly={isLocked}
                              value={task.notes}
                              onChange={(e) => updateTaskField(task.id, "notes", e.target.value)}
                              className="w-full bg-transparent border border-zinc-100 dark:border-zinc-800 p-2 text-xs text-zinc-600 dark:text-zinc-300 focus:ring-primary/5 resize-none min-h-[60px] rounded-lg"
                            />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Evidence & Attachments */}
            <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Global Evidence</h3>
              
              {!isLocked && (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-100 rounded-2xl cursor-pointer hover:bg-zinc-50 transition-colors group">
                    <UploadCloud className="h-8 w-8 text-zinc-300 mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-bold text-zinc-400">UPLOAD DELIVERABLE</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste Figma/PR link..." 
                      className="h-10 text-xs rounded-xl"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                    />
                    <Button type="button" size="sm" onClick={addLink} className="h-10 px-3 rounded-xl">ADD</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {formData.attachments?.map((att) => (
                  <div key={att.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50">
                    <div className="shrink-0 pt-3">
                      {att.type === 'link' ? <LinkIcon className="h-3.5 w-3.5 text-primary" /> : <FileText className="h-3.5 w-3.5 text-zinc-400" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {isLocked ? (
                        <>
                          <p className="truncate text-[11px] font-bold text-zinc-600">{att.name}</p>
                          <p className="truncate text-[10px] text-zinc-400">{att.url}</p>
                        </>
                      ) : (
                        <>
                          <Input
                            value={att.name}
                            onChange={(e) => updateAttachment(att.id, "name", e.target.value)}
                            placeholder="Evidence name"
                            className="h-9 rounded-lg bg-white text-[11px] font-bold"
                          />
                          <Input
                            value={att.url}
                            onChange={(e) => updateAttachment(att.id, "url", e.target.value)}
                            placeholder="Evidence URL"
                            className="h-9 rounded-lg bg-white text-[11px]"
                          />
                          <Select
                            value={att.type}
                            onValueChange={(value) => updateAttachment(att.id, "type", value)}
                          >
                            <SelectTrigger className="h-8 rounded-lg bg-white text-[10px] font-bold uppercase">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="link">LINK</SelectItem>
                              <SelectItem value="document">DOCUMENT</SelectItem>
                              <SelectItem value="spreadsheet">SPREADSHEET</SelectItem>
                              <SelectItem value="presentation">PRESENTATION</SelectItem>
                              <SelectItem value="image">IMAGE</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                    {!isLocked && (
                      <button type="button" onClick={() => removeAttachment(att.id)} className="pt-3 text-zinc-300 hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Audit Trail */}
            <div className="px-4 text-center">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Workspace Node ID: 0x92f1...33</p>
              <div className="mt-2 flex justify-center gap-2">
                 <div className="h-1 w-1 rounded-full bg-success"></div>
                 <div className="h-1 w-1 rounded-full bg-success"></div>
                 <div className="h-1 w-1 rounded-full bg-zinc-200"></div>
              </div>
            </div>
          </div>

          {/* Sidebar Area - Metadata */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Metadata & Actions */}
            <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                   <Calendar className="h-3 w-3" /> Reporting Date
                </Label>
                <Input 
                  type="date" 
                  readOnly={isLocked}
                  className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-100 h-12 text-sm font-bold"
                  value={formData.date}
                  onChange={handleInputChange}
                  id="date"
                />
              </div>

              {!isLocked && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isLoading || !dbId}
                    onClick={() => handleAction('draft')}
                    className="h-12 rounded-xl text-xs font-bold gap-2"
                    title={!dbId ? "Save the log first before saving as draft" : ""}
                  >
                    <History className="h-3.5 w-3.5" /> Save Draft
                  </Button>
                  <Button 
                    type="button" 
                    disabled={isLoading}
                    onClick={() => handleAction('submit')}
                    className="h-12 rounded-xl text-xs font-bold gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit Log
                  </Button>
                </div>
              )}

              {isLocked && (
                 <div className="p-4 rounded-xl bg-success/5 border border-success/10">
                    <div className="flex items-center gap-2 text-success mb-1">
                       <ShieldCheck className="h-4 w-4" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Authenticated Submission</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-medium">This document is digitally signed and stored in the enterprise ledger.</p>
                 </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
