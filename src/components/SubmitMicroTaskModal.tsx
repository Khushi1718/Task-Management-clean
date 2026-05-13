"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  SendHorizonal,
  Plus,
  X,
  Link as LinkIcon,
  FileText,
  Loader2,
  Upload,
  CheckCircle2,
  File,
} from "lucide-react";
import { adminMicroTasks, files as fileApi, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SubmitMicroTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: any; // For editing
}

interface ProofFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "link" | "document" | "spreadsheet" | "presentation";
}

interface TaskRow {
  title: string;
  description: string;
}

export function SubmitMicroTaskModal({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: SubmitMicroTaskModalProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([{ title: "", description: "" }]);
  const [proofLinks, setProofLinks] = useState<string[]>([""]);
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [hoursSpent, setHoursSpent] = useState("");
  const [minutesSpent, setMinutesSpent] = useState("");
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize for edit mode
  useEffect(() => {
    if (initialData && open) {
      setTasks([{ 
        title: initialData.title || "", 
        description: initialData.description || "" 
      }]);
      setProofLinks(initialData.proofLinks?.length > 0 ? initialData.proofLinks : [""]);
      setProofFiles(initialData.proofFiles || []);
      
      const totalMins = initialData.timeSpent || 0;
      setHoursSpent(Math.floor(totalMins / 60).toString());
      setMinutesSpent((totalMins % 60).toString());
      
      if (initialData.taskDate) {
        setTaskDate(new Date(initialData.taskDate).toISOString().split("T")[0]);
      }
    } else if (!initialData && open) {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setTasks([{ title: "", description: "" }]);
    setProofLinks([""]);
    setProofFiles([]);
    setHoursSpent("");
    setMinutesSpent("");
    setTaskDate(new Date().toISOString().split("T")[0]);
  };

  /* ── task rows ── */
  const handleAddTask = () =>
    setTasks((prev) => [...prev, { title: "", description: "" }]);

  const handleRemoveTask = (i: number) =>
    setTasks((prev) => prev.filter((_, idx) => idx !== i));

  const handleTaskChange = (i: number, field: keyof TaskRow, value: string) => {
    setTasks((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  /* ── proof links ── */
  const handleAddLink = () => setProofLinks((prev) => [...prev, ""]);
  const handleLinkChange = (i: number, value: string) => {
    setProofLinks((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };
  const handleRemoveLink = (i: number) => {
    if (proofLinks.length === 1) { setProofLinks([""]); return; }
    setProofLinks((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* ── file upload ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setIsUploading(true);
    try {
      const newFiles: ProofFile[] = [];
      for (let i = 0; i < selected.length; i++) {
        const res = await fileApi.upload(selected[i]);
        if (res.success && res.data) newFiles.push(res.data as ProofFile);
      }
      setProofFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Upload failed"));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    const validTasks = tasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) {
      toast.error("Add at least one task with a title");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanLinks = proofLinks.filter((l) => l.trim());

      const bundleTitle = validTasks.length === 1
        ? validTasks[0].title
        : `${validTasks.length} tasks – ${validTasks[0].title}${validTasks.length > 1 ? "..." : ""}`;

      const combinedDesc = validTasks
        .map((t, i) => `${validTasks.length > 1 ? `${i + 1}. ` : ""}${t.title}${t.description ? `\n   ${t.description}` : ""}`)
        .join("\n\n");

      const totalMinutes = (parseInt(hoursSpent, 10) || 0) * 60 + (parseInt(minutesSpent, 10) || 0);

      const payload = {
        title: bundleTitle,
        description: combinedDesc || undefined,
        proofLinks: cleanLinks.length > 0 ? cleanLinks : undefined,
        proofFiles: proofFiles.length > 0 ? proofFiles : undefined,
        timeSpent: totalMinutes,
        taskDate,
      };

      let res;
      if (initialData) {
        res = await adminMicroTasks.update(initialData._id, payload);
      } else {
        res = await adminMicroTasks.submit(payload);
      }

      if (res.success) {
        toast.success(initialData ? "Micro-task report updated!" : "Task report submitted to Master Admin!", {
          description: initialData ? "Your accountability record has been updated." : "Your accountability record has been received.",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.message || "Submission failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) { resetForm(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">

        {/* ── Header (matches New Assignment Bundle style) ── */}
        <DialogHeader className="p-6 pb-0 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <SendHorizonal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{initialData ? "Update Task Report" : "Submit a Task"}</DialogTitle>
              <DialogDescription>
                {initialData ? "Modify your self-initiated work report." : "Report self-initiated work to the Master Admin for accountability"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Date and Time Spent */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Task Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="h-10 text-sm border-border/50 bg-accent/5 focus:ring-1 shadow-sm rounded-xl"
              />
            </div>
            <div className="col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hours
              </Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                className="h-10 text-sm border-border/50 bg-accent/5 focus:ring-1 shadow-sm rounded-xl"
              />
            </div>
            <div className="col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mins
              </Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                max="59"
                value={minutesSpent}
                onChange={(e) => setMinutesSpent(e.target.value)}
                className="h-10 text-sm border-border/50 bg-accent/5 focus:ring-1 shadow-sm rounded-xl"
              />
            </div>
          </div>

          {/* Task rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tasks <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddTask}
                className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-2 font-bold text-[10px] uppercase"
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {tasks.map((task, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18 }}
                    className="p-4 rounded-xl border border-border/50 bg-accent/5 hover:bg-accent/10 transition-all group"
                  >
                    <div className="grid gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder={`Task ${idx + 1} title`}
                            value={task.title}
                            onChange={(e) => handleTaskChange(idx, "title", e.target.value)}
                            className="h-9 text-sm border-none bg-background shadow-sm focus:ring-1"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTask(idx)}
                          disabled={tasks.length === 1}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <textarea
                        placeholder="Description (optional) — what did you do? any context for master admin..."
                        value={task.description}
                        onChange={(e) => handleTaskChange(idx, "description", e.target.value)}
                        rows={2}
                        className="w-full p-2.5 rounded-lg text-sm bg-background border-none shadow-sm focus:ring-1 outline-none resize-none text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Proof Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> Proof Links
                <span className="text-[10px] font-semibold text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddLink}
                className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-2 font-bold text-[10px] uppercase"
              >
                <Plus className="h-3.5 w-3.5" /> Add Link
              </Button>
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {proofLinks.map((link, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="https://drive.google.com/... or https://github.com/..."
                        value={link}
                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                        className="h-9 pl-9 text-xs border-border/50 bg-accent/5 focus:ring-1 shadow-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLink(idx)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Proof Files */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Proof Files / PDFs
              <span className="text-[10px] font-semibold text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
            </Label>

            {/* uploaded files */}
            <AnimatePresence initial={false}>
              {proofFiles.map((file, idx) => (
                <motion.div
                  key={file.id || idx}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-accent/5 group"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <File className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{file.type}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setProofFiles((p) => p.filter((_, i) => i !== idx))}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* upload zone */}
            <label
              className={cn(
                "flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                isUploading
                  ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                  : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upload Files or PDFs</span>
                </>
              )}
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="p-6 bg-accent/5 border-t border-border/50 shrink-0">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || tasks.every((t) => !t.title.trim()) || isUploading}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <SendHorizonal className="h-4 w-4" />
                {initialData ? "Update Report" : "Submit Task"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
