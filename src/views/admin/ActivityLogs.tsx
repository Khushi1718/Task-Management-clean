import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatRelative } from "@/lib/mock-data";
import { Activity as ActivityIcon, Loader2 } from "lucide-react";
import { admin } from "@/lib/api";

export default function ActivityLogs() {
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await admin.getActivityLogs(50, 0);
        if (res.success && res.data) {
          setActivityLogs(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  return (
    <AppShell role="admin" title="Activity logs" subtitle="A complete audit trail of every action.">
      <div className="rounded-xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No activity logs found.</div>
        ) : (
          <ol className="relative">
            {activityLogs.map((e: any, i: number) => (
              <li key={`${e.id || e._id}-${i}`} className="relative flex gap-4 border-b border-border px-6 py-4 last:border-b-0">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{e.userId?.name || e.user?.name || 'System'}</span>{" "}
                    <span className="text-muted-foreground">{e.action.replace('_', ' ')}</span>{" "}
                    <span className="font-medium capitalize">{e.resourceType} {e.resourceId ? `#${e.resourceId.substring(0, 8)}` : ''}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelative(e.timestamp || e.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}