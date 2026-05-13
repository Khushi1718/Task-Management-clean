"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { adminMicroTasks } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  SendHorizonal,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  Loader2,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Filter,
  User,
  Building2,
  Calendar,
  X,
  ChevronDown,
  Star,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type MicroTaskStatus = "pending" | "reviewed" | "acknowledged";

interface MicroTask {
  _id: string;
  title: string;
  description?: string;
  proofLinks: string[];
  proofFiles: { id: string; name: string; url: string; type: string }[];
  timeSpent?: number;
  taskDate: string;
  status: MicroTaskStatus;
  masterAdminNote?: string;
  reviewedAt?: string;
  submittedAt: string;
  submittedBy: {
    _id: string;
    name: string;
    email: string;
    team: string;
    role: string;
  };
}

const STATUS_CONFIG: Record<
  MicroTaskStatus,
  { label: string; color: string; icon: typeof Clock; badgeClass: string }
> = {
  pending: {
    label: "Pending Review",
    color: "text-amber-600",
    icon: Clock,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-600",
  },
  reviewed: {
    label: "Reviewed",
    color: "text-blue-600",
    icon: Eye,
    badgeClass: "border-blue-200 bg-blue-50 text-blue-600",
  },
  acknowledged: {
    label: "Acknowledged",
    color: "text-emerald-600",
    icon: CheckCircle2,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
};

export default function AdminMicroTasksView() {
  const [microTasks, setMicroTasks] = useState<MicroTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<MicroTask | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "acknowledged">("acknowledged");
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchMicroTasks = async () => {
    try {
      setIsLoading(true);
      const res = await adminMicroTasks.getAll(
        50, 
        0, 
        filterStatus === "all" ? undefined : filterStatus,
        filterDate || undefined
      );
      if (res.success) {
        setMicroTasks(res.data || []);
      }
    } catch (error: any) {
      toast.error("Failed to fetch micro-tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMicroTasks();
  }, [filterStatus, filterDate]);

  const handleOpenReview = (task: MicroTask) => {
    setSelectedTask(task);
    setReviewNote(task.masterAdminNote || "");
    setReviewStatus("acknowledged");
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedTask) return;
    setIsReviewing(true);
    try {
      const res = await adminMicroTasks.review(selectedTask._id, reviewStatus, reviewNote);
      if (res.success) {
        toast.success(`Micro-task ${reviewStatus} successfully`, {
          description: `Feedback sent to ${selectedTask.submittedBy.name}`,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        });
        setIsReviewModalOpen(false);
        setSelectedTask(null);
        fetchMicroTasks();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to review micro-task");
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredTasks = microTasks.filter((task) => {
    const q = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.submittedBy?.name?.toLowerCase().includes(q) ||
      task.submittedBy?.team?.toLowerCase().includes(q)
    );
  });

  const pendingCount = microTasks.filter((t) => t.status === "pending").length;

  return (
    <AppShell role="master_admin" title="Admin Accountability Inbox">
      <div className="max-w-[1400px] mx-auto space-y-10 pb-24">

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Total Submissions", value: microTasks.length, color: "text-zinc-900", bg: "bg-zinc-50" },
            { label: "Awaiting Review", value: microTasks.filter(t => t.status === "pending").length, color: "text-amber-600", bg: "bg-amber-50/40" },
            { label: "Acknowledged", value: microTasks.filter(t => t.status === "acknowledged").length, color: "text-emerald-600", bg: "bg-emerald-50/40" },
          ].map((s, i) => (
            <div key={i} className={cn("p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800 shadow-sm", s.bg)}>
              <p className={cn("text-3xl font-black tracking-tighter mb-1", s.color)}>{s.value}</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search by admin, task, or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-2xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-9 h-10 w-44 rounded-2xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-100 dark:border-zinc-700">
            {(["all", "pending", "reviewed", "acknowledged"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all capitalize",
                  filterStatus === s
                    ? "bg-white dark:bg-zinc-700 text-zinc-950 dark:text-zinc-50 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s as MicroTaskStatus]?.label || s}
                {s === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-white text-[8px] font-black">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[48px]">
            <div className="h-16 w-16 rounded-[24px] bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
              <SendHorizonal className="h-7 w-7 text-zinc-300" />
            </div>
            <div>
              <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-50">No submissions found</p>
              <p className="text-[11px] text-zinc-400 mt-1 font-bold uppercase tracking-wider">
                {filterStatus !== "all" ? "Try a different filter" : "Admins have not submitted any micro-tasks yet"}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task, index) => {
                const cfg = STATUS_CONFIG[task.status];
                const StatusIcon = cfg.icon;
                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleOpenReview(task)}
                  >
                    {/* Status accent line */}
                    <div className={cn(
                      "absolute top-0 left-8 right-8 h-0.5 rounded-full",
                      task.status === "pending" ? "bg-amber-400" :
                      task.status === "reviewed" ? "bg-blue-400" : "bg-emerald-400"
                    )} />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4 mt-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border", cfg.badgeClass)}
                        >
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {cfg.label}
                        </Badge>
                        {task.timeSpent ? (
                          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-zinc-100 text-zinc-600 border-none">
                            {task.timeSpent >= 60 
                              ? `${Math.floor(task.timeSpent / 60)}h ${task.timeSpent % 60}m` 
                              : `${task.timeSpent}m`}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0">
                        {new Date(task.taskDate || task.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-black text-zinc-900 dark:text-zinc-50 leading-snug mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                        {task.description}
                      </p>
                    )}

                    {/* Proof indicators */}
                    <div className="flex items-center gap-3 mb-5">
                      {task.proofLinks.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <LinkIcon className="h-3 w-3" />
                          {task.proofLinks.length} Link{task.proofLinks.length !== 1 ? "s" : ""}
                        </div>
                      )}
                      {task.proofFiles.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <FileText className="h-3 w-3" />
                          {task.proofFiles.length} File{task.proofFiles.length !== 1 ? "s" : ""}
                        </div>
                      )}
                      {task.proofLinks.length === 0 && task.proofFiles.length === 0 && (
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest italic">No attachments</span>
                      )}
                    </div>

                    {/* Submitted by */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                          <span className="text-[11px] font-black text-white">
                            {task.submittedBy?.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-zinc-900 dark:text-zinc-50">
                            {task.submittedBy?.name}
                          </p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                            {task.submittedBy?.team}
                          </p>
                        </div>
                      </div>
                      {task.status === "pending" && (
                        <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <Eye className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={(open) => { if (!isReviewing) setIsReviewModalOpen(open); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[32px]">
          {/* Modal Header */}
          <div className="bg-zinc-950 p-7 pb-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white tracking-tight">
                  Review Micro-Task
                </DialogTitle>
                <DialogDescription className="text-[11px] text-white/40 font-bold uppercase tracking-[0.3em] mt-0.5">
                  Admin Accountability Submission
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-7 space-y-6 bg-white dark:bg-zinc-950">
            {selectedTask && (
              <>
                {/* Submitted By */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-[14px] font-black text-white">
                      {selectedTask.submittedBy?.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-zinc-900 dark:text-zinc-50">
                      {selectedTask.submittedBy?.name}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {selectedTask.submittedBy?.role?.replace("_", " ")} • {selectedTask.submittedBy?.team}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                      {selectedTask.submittedBy?.email}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Task Date: {new Date(selectedTask.taskDate || selectedTask.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                    {selectedTask.timeSpent && (
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                        Time Spent: {selectedTask.timeSpent >= 60 
                          ? `${Math.floor(selectedTask.timeSpent / 60)}h ${selectedTask.timeSpent % 60}m` 
                          : `${selectedTask.timeSpent}m`}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 font-bold mt-2">
                      Submitted: {new Date(selectedTask.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {/* Task Details */}
                <div className="space-y-3">
                  <h3 className="text-[18px] font-black text-zinc-900 dark:text-zinc-50 leading-snug">
                    {selectedTask.title}
                  </h3>
                  {selectedTask.description && (
                    <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {selectedTask.description}
                    </p>
                  )}
                </div>

                {/* Proof Links */}
                {selectedTask.proofLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <LinkIcon className="h-3 w-3" /> Proof Links
                    </p>
                    <div className="space-y-2">
                      {selectedTask.proofLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="text-[12px] font-bold text-blue-600 truncate flex-1">{link}</span>
                          <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-blue-500 transition-colors shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proof Files */}
                {selectedTask.proofFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <FileText className="h-3 w-3" /> Attached Files
                    </p>
                    <div className="space-y-2">
                      {selectedTask.proofFiles.map((file, i) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50 truncate">{file.name}</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{file.type}</p>
                          </div>
                          <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-blue-500 transition-colors shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Section */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" /> Your Response
                  </p>

                  {/* Status selection */}
                  <div className="grid grid-cols-2 gap-3">
                    {(["reviewed", "acknowledged"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setReviewStatus(s)}
                        className={cn(
                          "p-3 rounded-2xl border-2 text-left transition-all",
                          reviewStatus === s
                            ? s === "acknowledged"
                              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                              : "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {s === "acknowledged" ? (
                            <CheckCircle2 className={cn("h-4 w-4", reviewStatus === s ? "text-emerald-500" : "text-zinc-300")} />
                          ) : (
                            <Eye className={cn("h-4 w-4", reviewStatus === s ? "text-blue-500" : "text-zinc-300")} />
                          )}
                          <span className={cn(
                            "text-[11px] font-black uppercase tracking-widest",
                            reviewStatus === s
                              ? s === "acknowledged" ? "text-emerald-600" : "text-blue-600"
                              : "text-zinc-400"
                          )}>
                            {s === "acknowledged" ? "Acknowledge" : "Mark Reviewed"}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {s === "acknowledged"
                            ? "Confirm you've seen and accepted this work"
                            : "Mark as reviewed (still needs action)"}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      Master Admin Note
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-1.5 border-zinc-200 text-zinc-400">
                        Optional
                      </Badge>
                    </Label>
                    <textarea
                      placeholder="Leave feedback or instructions for the admin..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm font-medium p-3.5 outline-none resize-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 py-5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="ghost"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isReviewing}
              className="h-10 px-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-zinc-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isReviewing}
              className={cn(
                "h-10 px-6 rounded-2xl text-white shadow-xl text-[11px] font-black uppercase tracking-widest gap-2 transition-all hover:scale-[1.02]",
                reviewStatus === "acknowledged"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isReviewing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : reviewStatus === "acknowledged" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Acknowledge
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Mark Reviewed
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
