import { useEffect, useState } from "react";
import TaskBoard from "@/views/shared/TaskBoard";
import { auth } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function AllLogs() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await auth.getProfile();
      if (res.success) setUser(res.data);
      setLoading(false);
    };
    fetchUser();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const role = user?.role || "admin";

  return (
    <TaskBoard 
      role={role} 
      title={role === "master_admin" ? "Enterprise Board" : "Task Board"} 
      subtitle={role === "master_admin" 
        ? "System-wide strategic oversight of all corporate assignments." 
        : "Operational command of team task bundles and assignments."
      }
      hideTabs={role === "employee"}
    />
  );
}