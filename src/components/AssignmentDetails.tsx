import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Link as LinkIcon, 
  ExternalLink, 
  FileText, 
  ArrowUpRight,
  PlayCircle,
  StopCircle,
  X,
  Plus,
  Loader2,
  File,
  SendHorizontal,
  Save,
  ChevronDown,
  ChevronUp,
  Download,
  Eye
} from "lucide-react";
import { tasks, apiRequest, getErrorMessage, files as fileApi } from "@/lib/api";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssignmentDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  currentUser: any;
  onTaskUpdate?: () => void;
}

export function AssignmentDetails({ 
  isOpen, 
  onClose, 
  assignment, 
  currentUser, 
  onTaskUpdate 
}: AssignmentDetailsProps) {
  const [assignmentTasks, setAssignmentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null); // taskId being uploaded
  
  // Track expanded tasks for submission
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  // Local state for evidence data per task
  const [taskEvidence, setTaskEvidence] = useState<Record<string, any>>({});

  const fetchAssignmentTasks = async (assignmentId: string) => {
    try {
      setLoading(true);
      const res = await tasks.getAssignmentTasks(assignmentId);
      if (res.success) {
        const tasksData = res.data || [];
        setAssignmentTasks(tasksData);
        
        // Initialize local evidence state from fetched tasks
        const initialEvidence: Record<string, any> = {};
        tasksData.forEach((t: any) => {
          initialEvidence[t._id] = {
            completionRemarks: t.completionRemarks || "",
            evidence: t.evidence || "",
            evidenceFiles: t.evidenceFiles || []
          };
        });
        setTaskEvidence(initialEvidence);
      }
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assignment) {
      if (assignment.isMicroTask) {
        const tasksData = assignment.tasks || [];
        setAssignmentTasks(tasksData);
        
        // Initialize local evidence state
        const initialEvidence: Record<string, any> = {};
        tasksData.forEach((t: any, idx: number) => {
          const id = t._id || `micro-${idx}`;
          initialEvidence[id] = {
            completionRemarks: t.completionRemarks || "",
            evidence: t.evidence || (t.proofLinks?.[0] || ""),
            evidenceFiles: t.proofFiles || []
          };
        });
        setTaskEvidence(initialEvidence);
      } else {
        fetchAssignmentTasks(assignment._id || assignment.id);
      }
    }
  }, [isOpen, assignment]);

  const handleToggleTimer = async (taskId: string, currentAction: "start" | "stop") => {
    try {
      const res = await tasks.toggleTimer(taskId, currentAction);
      if (res.success) {
        fetchAssignmentTasks(assignment._id || assignment.id);
        toast.success(`Timer ${currentAction}ed`);
        if (onTaskUpdate) onTaskUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || "Timer action failed");
    }
  };

  const handleFileUpload = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(taskId);
    try {
      const currentEvidence = taskEvidence[taskId] || { evidenceFiles: [] };
      const newFiles = [...(currentEvidence.evidenceFiles || [])];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await fileApi.upload(file);
        if (res.success) newFiles.push(res.data);
      }

      
      setTaskEvidence({
        ...taskEvidence,
        [taskId]: { ...currentEvidence, evidenceFiles: newFiles }
      });
      toast.success("Files attached to draft");
    } catch (error) {
      toast.error(getErrorMessage(error, "File upload failed"));
    } finally {
      setIsUploading(null);
    }
  };

  const updateTaskField = (taskId: string, field: string, value: any) => {
    setTaskEvidence({
      ...taskEvidence,
      [taskId]: {
        ...(taskEvidence[taskId] || {}),
        [field]: value
      }
    });
  };

  const handleSaveProgress = async (taskId: string, finalize = false) => {
    const evidence = taskEvidence[taskId];
    if (finalize && !evidence.completionRemarks && !evidence.evidence && (!evidence.evidenceFiles || evidence.evidenceFiles.length === 0)) {
      toast.error("Please provide at least one form of proof to finalize");
      return;
    }

    try {
      const res = await tasks.update(taskId, {
        status: finalize ? "completed" : undefined,
        ...evidence
      });
      if (res.success) {
        toast.success(finalize ? "Task finalized successfully" : "Progress saved as draft");
        fetchAssignmentTasks(assignment._id || assignment.id);
        if (onTaskUpdate) onTaskUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": return "text-destructive border-destructive/20 bg-destructive/5";
      case "medium": return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      case "low": return "text-blue-500 border-blue-500/20 bg-blue-500/5";
      default: return "text-zinc-400 border-zinc-200 bg-zinc-50";
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDownloadUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("/raw/")) return url; // Raw assets don't support fl_attachment
    if (url.includes("cloudinary.com") && !url.includes("fl_attachment")) {
      return url.replace("/upload/", "/upload/fl_attachment/");
    }
    return url;
  };

  const getViewUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("/raw/")) return url; // Raw assets don't support fl_inline
    if (url.includes("cloudinary.com") && !url.includes("fl_inline")) {
      return url.replace("/upload/", "/upload/fl_inline/");
    }
    return url;
  };

  if (!assignment) return null;

  const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;
  const assigneeId = assignment.assignedTo?._id || assignment.assignedTo?.id || assignment.assignedTo;
  const isAssignee = currentUserId && assigneeId && (String(currentUserId) === String(assigneeId));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl bg-white dark:bg-zinc-950">
        <DialogHeader className="p-8 pb-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center text-white dark:text-zinc-900 shadow-lg">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{assignment.title}</DialogTitle>
                <DialogDescription className="text-xs font-medium text-zinc-500 mt-0.5">
                  Assigned to <span className="text-zinc-900 dark:text-zinc-300 font-bold">{assignment.assignedTo?.name}</span> • {assignmentTasks.length} Tasks
                </DialogDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Bundle Progress</div>
              <div className="flex items-center gap-4">
                <div className="h-2.5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full bg-zinc-900 dark:bg-zinc-50 transition-all duration-1000" style={{ width: `${assignment.isMicroTask ? 100 : (assignment.progress || 0)}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums">{assignment.isMicroTask ? 100 : Math.round(assignment.progress || 0)}%</span>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-zinc-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
               <div className="h-8 w-8 border-3 border-zinc-200 border-t-zinc-900 animate-spin rounded-full" />
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Loading Secure Data...</p>
            </div>
          ) : (
            assignmentTasks.map((task, idx) => {
              const taskId = task._id || `micro-${idx}`;
              const evidence = taskEvidence[taskId] || { completionRemarks: "", evidence: "", evidenceFiles: [] };
              const isExpanded = expandedTasks[taskId] || task.status === 'in_progress';

              return (
                <div key={taskId} className={cn(
                  "rounded-3xl border transition-all duration-300 overflow-hidden",
                  task.status === 'completed' 
                    ? "bg-emerald-50/20 border-emerald-100/50 dark:bg-emerald-950/5 dark:border-emerald-900/20" 
                    : "bg-white dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md"
                )}>
                  {/* Header Row */}
                  <div className="p-6 flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{task.title}</h4>
                        <Badge variant="outline" className={cn("text-[8px] uppercase font-bold tracking-widest", getPriorityColor(task.priority))}>
                          {task.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-[8px] uppercase font-bold tracking-widest bg-zinc-100 dark:bg-zinc-800">
                          {assignment.isMicroTask ? "SUBMITTED" : task.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium">{task.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-100 dark:border-zinc-700 text-[10px] font-bold tabular-nums">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        {formatTime(task.timeSpent || 0)}
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status !== 'completed' && isAssignee && !assignment.isMicroTask && (
                          <>
                            {task.timerStartedAt ? (
                              <Button size="sm" variant="outline" className="h-9 px-4 text-[9px] font-bold uppercase tracking-widest gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl" onClick={() => handleToggleTimer(taskId, 'stop')}>
                                <StopCircle className="h-4 w-4" /> Stop
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-9 px-4 text-[9px] font-bold uppercase tracking-widest gap-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl" onClick={() => handleToggleTimer(taskId, 'start')}>
                                <PlayCircle className="h-4 w-4" /> Start
                              </Button>
                            )}
                          </>
                        )}
                        {task.status === 'completed' ? (
                          <div className="h-9 flex items-center gap-2 text-emerald-600 font-bold text-[9px] uppercase bg-emerald-50 dark:bg-emerald-950/20 px-4 rounded-xl border border-emerald-100">
                            <CheckCircle2 className="h-4 w-4" /> Completed
                          </div>
                        ) : (
                          isAssignee && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-9 w-9 p-0 rounded-xl hover:bg-zinc-100"
                              onClick={() => toggleExpand(taskId)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submission Form (Inline) */}
                  {isExpanded && task.status !== 'completed' && isAssignee && !assignment.isMicroTask && (
                    <div className="px-6 pb-6 pt-2 border-t border-dashed border-zinc-100 dark:border-zinc-800 space-y-6 bg-zinc-50/30 dark:bg-zinc-900/20">
                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <div className="grid gap-2">
                              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Remarks & Draft Notes</Label>
                              <textarea 
                                placeholder="Describe your progress or results here..." 
                                value={evidence.completionRemarks}
                                onChange={(e) => updateTaskField(task._id, "completionRemarks", e.target.value)}
                                className="w-full min-h-[120px] p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 focus:ring-2 focus:ring-zinc-900/5 outline-none text-sm transition-all resize-none font-medium shadow-sm"
                              />
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="grid gap-2">
                              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Evidence URL</Label>
                              <div className="relative">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <Input 
                                  placeholder="https://drive.google.com/..." 
                                  value={evidence.evidence}
                                  onChange={(e) => updateTaskField(task._id, "evidence", e.target.value)}
                                  className="pl-12 bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 h-12 rounded-xl text-sm shadow-sm"
                                />
                              </div>
                           </div>

                           <div className="grid gap-2">
                              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Attachments</Label>
                              <div className="flex flex-wrap gap-2">
                                {evidence.evidenceFiles?.map((file: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                    <File className="h-3.5 w-3.5" />
                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                    <button onClick={() => {
                                      const newFiles = evidence.evidenceFiles.filter((_: any, i: number) => i !== idx);
                                      updateTaskField(task._id, "evidenceFiles", newFiles);
                                    }} className="hover:text-destructive transition-colors">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <label className="flex items-center gap-2 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-zinc-400 cursor-pointer text-[10px] font-bold px-4 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all border-dashed">
                                  {isUploading === task._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                  <span>{isUploading === task._id ? "Uploading..." : "Attach File"}</span>
                                  <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(task._id, e)} disabled={isUploading === task._id} />
                                </label>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                         <Button 
                            variant="outline" 
                            className="h-11 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2 border-zinc-200"
                            onClick={() => handleSaveProgress(task._id, false)}
                         >
                            <Save className="h-3.5 w-3.5" /> Save Draft
                         </Button>
                         <Button 
                            className="h-11 px-8 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 shadow-lg text-[10px] font-black uppercase tracking-widest gap-2"
                            onClick={() => handleSaveProgress(task._id, true)}
                         >
                            Finalize & Submit <SendHorizontal className="h-3.5 w-3.5" />
                         </Button>
                      </div>
                    </div>
                  )}

                  {/* Completed Evidence View (Read Only) */}
                  {task.status === 'completed' && (task.completionRemarks || task.evidence || (task.evidenceFiles && task.evidenceFiles.length > 0)) && (
                    <div className="px-6 pb-6">
                      <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10">
                        <div className="px-4 py-2 border-b border-emerald-100/50 flex items-center justify-between">
                           <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                              <ShieldCheck className="h-3.5 w-3.5" /> Proof of Work
                           </p>
                           {task.completedAt && (
                              <span className="text-[8px] font-medium text-emerald-600/60 uppercase">
                                 {new Date(task.completedAt).toLocaleString()}
                              </span>
                           )}
                        </div>
                        <div className="p-4 space-y-4">
                          {task.completionRemarks && (
                            <div>
                              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter mb-1">Personnel Remarks</p>
                              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 italic leading-relaxed">"{task.completionRemarks}"</p>
                            </div>
                          )}
                          {(task.evidence || (task.evidenceFiles && task.evidenceFiles.length > 0)) && (
                             <div className="flex flex-wrap gap-3">
                                {task.evidence && (
                                  <a href={task.evidence} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] text-zinc-900 dark:text-white font-bold bg-white dark:bg-zinc-900 p-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                    <LinkIcon className="h-3 w-3" /> View Link <ExternalLink className="h-2.5 w-2.5 opacity-30" />
                                  </a>
                                )}
                                {task.evidenceFiles?.map((file: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 group/file w-full">
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-w-0">
                                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate flex-1">{file.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <a 
                                        href={getViewUrl(file.url)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                                        title="View File"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </a>
                                      <a 
                                        href={getDownloadUrl(file.url)} 
                                        download={file.name}
                                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                                        title="Download File"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                             </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
