import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/mock-data";
import { workLogs } from "@/lib/api";
import { toast } from "sonner";
import { 
  ArrowLeft, Calendar, User, Pencil, 
  FileText, FileSpreadsheet, Presentation, 
  Link as LinkIcon, Image as ImageIcon, 
  ExternalLink, Paperclip, CheckCircle2, Circle, Clock, ListTodo,
  CheckSquare, Square, History, ShieldCheck, MessageSquare,
  ChevronRight, ArrowRight, Download, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkLog, Task } from "@/lib/mock-data";
import { ChatWindow } from "@/components/ChatWindow";
import { auth } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function LogDetail() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const [log, setLog] = useState<WorkLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  
  const isAdmin = pathname.startsWith("/admin");
  const role = isAdmin ? "admin" : "employee";
  const basePath = isAdmin ? "/admin/logs" : "/employee/logs";

  useEffect(() => {
    const fetchLog = async () => {
      try {
        if (!id) return;
        const res = await workLogs.getDetail(id);
        if (res.success && res.data) {
          setLog(res.data);
        }
        
        const profile = await auth.getProfile();
        if (profile.success) {
          setCurrentUser(profile.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [id]);

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (log?.state === 'submitted') return;
    
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await workLogs.updateTaskStatus(id!, taskId, newStatus);
      if (res.success) {
        setLog(prev => {
          if (!prev) return prev;
          const newTasks = prev.tasks.map(t => 
            t.id === taskId ? { ...t, status: newStatus as any } : t
          );
          return { ...prev, tasks: newTasks };
        });
        toast.success(`Task marked as ${newStatus}`);
      }
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleFinalSubmit = async () => {
    if (confirm("Are you sure you want to finalize this log? Once submitted, it will be locked and cannot be edited further.")) {
      try {
        const res = await workLogs.submitLog(id!);
        if (res.success) {
          setLog(prev => prev ? { ...prev, state: 'submitted', submittedAt: new Date().toISOString() } : prev);
          toast.success("Log finalized and submitted successfully!");
        }
      } catch (error) {
        toast.error("Failed to submit log");
      }
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="h-5 w-5 text-primary" />;
      case "spreadsheet": return <FileSpreadsheet className="h-5 w-5 text-success" />;
      case "presentation": return <Presentation className="h-5 w-5 text-orange-500" />;
      case "document": return <FileText className="h-5 w-5 text-info" />;
      case "link": return <LinkIcon className="h-5 w-5 text-foreground" />;
      default: return <Paperclip className="h-5 w-5 text-muted-foreground" />;
    }
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

  return (
    <AppShell role={role} title="Log Intelligence" subtitle="Detailed audit of tasks and deliverables.">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link to={basePath}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to logs</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !log ? (
        <div className="text-center py-24 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200">
           <History className="h-12 w-12 text-zinc-100 mx-auto mb-4" />
           <p className="text-lg font-bold text-zinc-400">Log not found</p>
        </div>
      ) : (

      <div className="grid gap-8 lg:grid-cols-12 max-w-7xl mx-auto">
        
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header Summary */}
          <header className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">NODE_REF: {log.id}</p>
                   {log.state === 'submitted' && <div className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 text-success rounded-full text-[9px] font-bold uppercase"><ShieldCheck className="h-3 w-3" /> Immutable</div>}
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{log.title}</h1>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={log.status} />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{log.state?.replace('_', ' ') || 'draft'}</p>
                {log.state === 'draft' && role === 'employee' && (
                  <Button asChild variant="outline" size="sm" className="mt-2 rounded-xl text-[10px] font-bold gap-2">
                    <Link to={`/employee/logs/edit/${log._id || log.id}`}><Pencil className="h-3.5 w-3.5" /> Edit Log</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Workflow Checklist View */}
          <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <header className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/30">
               <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                 <ListTodo className="h-4 w-4 text-primary" /> Execution Checklist
               </h2>
            </header>
            
            <div className="p-8 space-y-8">
               {log.tasks && log.tasks.map((task) => (
                  <div key={task.id} className="space-y-4">
                     <div className="flex items-center gap-4 justify-between">
                        <div className="flex items-center gap-4 flex-1">
                           <button 
                             disabled={log.state === 'submitted'}
                             onClick={() => toggleTaskStatus(task.id, task.status)}
                             className={cn(
                               "p-1.5 rounded-lg transition-all",
                               task.status === 'completed' 
                                 ? 'bg-success text-white shadow-lg shadow-success/20' 
                                 : task.status === 'in_progress' 
                                   ? 'bg-primary/10 text-primary' 
                                   : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200',
                               log.state === 'submitted' && "cursor-not-allowed opacity-80"
                             )}
                           >
                              {task.status === 'completed' ? <CheckSquare className="h-4.5 w-4.5" /> : <Square className="h-4.5 w-4.5" />}
                           </button>
                           <div className="flex-1">
                              <h3 className={cn(
                                "text-base font-bold transition-all",
                                task.status === 'completed' ? 'line-through text-zinc-400 font-medium' : 'text-zinc-800 dark:text-zinc-200'
                              )}>
                                {task.text}
                              </h3>
                           </div>
                        </div>
                       <div className="flex items-center gap-2">
                          {task.priority && (
                             <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${
                                task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                                task.priority === 'medium' ? 'bg-orange-500/10 text-orange-500' :
                                'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                             }`}>
                                {task.priority}
                             </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${
                             task.status === 'completed' ? 'bg-success/10 text-success' :
                             task.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                             'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'
                          }`}>
                             {task.status}
                          </span>
                       </div>
                    </div>

                    {task.notes && (
                       <div className="ml-10 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex gap-3">
                          <MessageSquare className="h-4 w-4 text-zinc-300 mt-1" />
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold text-zinc-400 uppercase">Notes & Details</p>
                             <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{task.notes}</p>
                          </div>
                       </div>
                    )}
                 </div>
               ))}
            </div>
          </section>

          {/* Evidence Repository */}
          <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
               <Paperclip className="h-4 w-4 text-zinc-400" /> Evidence Repository
            </h2>
            
            {log.attachments && log.attachments.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {log.attachments.map((att) => (
                  <li key={att.id} className="group flex items-center gap-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 p-4 transition-all hover:bg-white hover:shadow-md">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100">
                      {getAttachmentIcon(att.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-700 group-hover:text-primary transition-colors">
                        {att.name}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5">{att.type}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={getViewUrl(att.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                        title="View File"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <a
                        href={getDownloadUrl(att.url)}
                        download={att.name}
                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                        title="Download File"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-100 bg-zinc-50/30 p-12 text-center">
                <Paperclip className="mx-auto h-8 w-8 text-zinc-200 mb-4" />
                <p className="text-sm font-bold text-zinc-400">No external assets linked to this record.</p>
              </div>
            )}
          </section>

          {log.state === 'draft' && (
            <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-primary uppercase">Ready to finalize your day?</h3>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-sm">
                  Submitting this log will lock the record and notify the management team of your daily output.
                </p>
              </div>
              <Button 
                onClick={handleFinalSubmit}
                className="rounded-xl px-8 py-6 h-auto bg-primary text-white shadow-xl shadow-primary/20 font-bold text-xs uppercase tracking-wider hover:scale-105 transition-all"
              >
                Finalize Daily Submission <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Record Details */}
          <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-8">Metadata Analysis</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-zinc-100">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(log.user || "Unknown").split(" ").map((p) => p[0]).slice(0,2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ownership</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{log.user || "Unknown User"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100">
                   <Calendar className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Target Date</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatDate(log.date)}</p>
                </div>
              </div>

              {/* Collaborative Discussion CTA */}
              <Sheet open={isDiscussionOpen} onOpenChange={setIsDiscussionOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full mt-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border-none font-bold text-xs py-6 group shadow-none">
                    <MessageSquare className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                    Open Internal Discussion
                  </Button>
                </SheetTrigger>
                <SheetContent className="p-0 sm:max-w-md w-full border-l border-zinc-200 dark:border-zinc-800">
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/30">
                      <SheetHeader className="text-left">
                        <SheetTitle className="text-sm font-bold uppercase tracking-wider">Log Collaboration</SheetTitle>
                        <SheetDescription className="text-[10px] font-bold uppercase tracking-tighter text-zinc-500">
                          Discussion context: {log.title}
                        </SheetDescription>
                      </SheetHeader>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {currentUser && (
                        <ChatWindow 
                          contextType="log"
                          contextId={log._id || log.id}
                          currentUserId={currentUser.id || currentUser._id}
                        />
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </section>

          {/* Activity Timeline */}
          <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
             <h2 className="text-sm font-bold uppercase tracking-wider mb-8 flex items-center gap-2">
                <History className="h-4 w-4 text-zinc-400" /> Activity Timeline
             </h2>
             <div className="relative space-y-8 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800">
                <div className="relative">
                   <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-white dark:border-zinc-950"></div>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Initialized</p>
                   <p className="text-xs font-bold text-zinc-700 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <div className="relative">
                   <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-zinc-200 border-2 border-white dark:border-zinc-950"></div>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Latest Update</p>
                   <p className="text-xs font-bold text-zinc-700 mt-1">{new Date(log.updatedAt).toLocaleString()}</p>
                </div>
                {log.submittedAt && (
                  <div className="relative">
                     <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-success border-2 border-white dark:border-zinc-950"></div>
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Finalized & Locked</p>
                     <p className="text-xs font-bold text-zinc-700 mt-1">{new Date(log.submittedAt).toLocaleString()}</p>
                  </div>
                )}
             </div>
          </section>

          {log.state === 'draft' && !isAdmin && (
             <Button asChild className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold shadow-xl">
                <Link to={`/employee/logs/edit/${log._id || log.id}`}><Pencil className="mr-2 h-4 w-4" /> Continue Drafting</Link>
             </Button>
          )}

        </aside>
      </div>
      )}
    </AppShell>
  );
}
