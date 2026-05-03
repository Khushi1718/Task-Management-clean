import { Link } from "@/lib/router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatTime } from "@/lib/mock-data";
import { ChevronRight, Paperclip } from "lucide-react";

// Backend returns _id (MongoDB ObjectId) and userId populated as an object
export interface BackendLog {
  _id?: string;
  id?: string;
  title: string;
  tasks?: Array<{
    id: string;
    text: string;
    status: "completed" | "in_progress" | "pending";
    priority: "high" | "medium" | "low";
    notes?: string;
  }>;
  meetingsAttended: number;
  focusForTomorrow?: string;
  status: "completed" | "in_progress" | "pending";
  date: string;
  // After population userId becomes an object, but we also accept a pre-transformed "user" string
  userId?: { _id: string; name: string; email: string; team?: string } | string;
  user?: string; // Pre-transformed display name
  userAvatar?: string;
  meetingNotes?: string;
  attachments?: any[];
}

function initials(name: string) {
  if (!name) return "??";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function getLogId(log: BackendLog): string {
  return log._id || log.id || "";
}

function getUserName(log: BackendLog): string {
  if (log.user) return log.user;
  if (log.userId && typeof log.userId === "object") return (log.userId as any).name || "Unknown";
  return "Unknown";
}

export function LogsTable({
  logs,
  basePath,
  showUser = false,
}: {
  logs: BackendLog[];
  basePath: string;
  showUser?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="hidden grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <div className="col-span-5">Title</div>
        {showUser && <div className="col-span-2">User</div>}
        <div className={showUser ? "col-span-2" : "col-span-3"}>Status</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-1 text-right">—</div>
      </div>
      <ul className="divide-y divide-border">
        {logs.map((log) => {
          const logId = getLogId(log);
          const userName = getUserName(log);
          return (
            <li key={logId}>
              <Link
                to={`${basePath}/${logId}`}
                className="grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50 md:grid-cols-12"
              >
                <div className="md:col-span-5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{log.title}</p>
                    {log.attachments && log.attachments.length > 0 && (
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {log.tasks && log.tasks.length > 0 
                      ? `${log.tasks.length} task${log.tasks.length !== 1 ? 's' : ''}`
                      : 'No tasks'
                    }
                  </p>
                </div>
                {showUser && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-semibold">
                        {initials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{userName}</span>
                  </div>
                )}
                <div className={showUser ? "md:col-span-2" : "md:col-span-3"}>
                  <StatusBadge status={log.status} />
                </div>
                <div className="text-sm text-muted-foreground md:col-span-2">
                  <div>{formatDate(log.date)}</div>
                  <div className="text-xs">{formatTime(log.date)}</div>
                </div>
                <div className="hidden justify-end text-muted-foreground md:col-span-1 md:flex">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
