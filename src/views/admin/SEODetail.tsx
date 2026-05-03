import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { workLogs } from "@/lib/api";
import { ArrowLeft, ExternalLink, FileText, Link as LinkIcon, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function SEODetail() {
  const { id } = useParams();
  const [log, setLog] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        if (!id) return;
        setIsLoading(true);
        const response = await workLogs.getDetail(id);
        if (response.success && response.data) {
          setLog(response.data);
        } else {
          toast.error("Failed to load SEO report");
        }
      } catch (error) {
        console.error("Error loading SEO report:", error);
        toast.error("Failed to load SEO report");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLog();
  }, [id]);

  const seoData = log?.seoData || { questionsAnswered: 0, backlinksCreated: 0, proofs: [] };

  return (
    <AppShell role="admin" title="SEO Report Detail" subtitle="SEO activity captured with the daily log.">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link to="/admin/seo-reports"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to SEO reports</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading SEO report...</span>
        </div>
      ) : !log ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">SEO report not found.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          <section className="lg:col-span-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Employee</p>
                <h2 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{log.userId?.name || log.user || "Unknown"}</h2>
                <p className="mt-1 text-sm text-zinc-500">{new Date(log.date).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={log.status} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Questions Answered</p>
                <p className="mt-2 text-4xl font-bold">{seoData.questionsAnswered || 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Backlinks Created</p>
                <p className="mt-2 text-4xl font-bold">{seoData.backlinksCreated || 0}</p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <LinkIcon className="h-4 w-4 text-primary" /> SEO Proofs
              </h3>
              {seoData.proofs?.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {seoData.proofs.map((proof: any) => (
                    <li key={proof.id}>
                      <a
                        href={proof.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 p-4 transition-colors hover:bg-white dark:hover:bg-zinc-900"
                      >
                        <LinkIcon className="h-4 w-4 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{proof.name || proof.url}</span>
                        <ExternalLink className="h-4 w-4 text-zinc-300 group-hover:text-primary" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-100 bg-zinc-50/30 p-8 text-center">
                  <p className="text-sm font-semibold text-zinc-400">No SEO proofs linked.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="lg:col-span-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <FileText className="h-4 w-4 text-zinc-400" /> Related Log Tasks
            </h3>
            {log.tasks?.length ? (
              <ul className="space-y-3">
                {log.tasks.map((task: any) => (
                  <li key={task.id} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4">
                    <p className="text-sm font-semibold">{task.text}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{task.status}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No related tasks.</p>
            )}
            <Button asChild className="mt-6 w-full rounded-xl">
              <Link to={`/admin/logs/${log._id || log.id}`}>
                <Search className="mr-2 h-4 w-4" /> Open Full Log
              </Link>
            </Button>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
