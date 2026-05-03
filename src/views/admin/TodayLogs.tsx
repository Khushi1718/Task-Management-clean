import { useEffect, useState } from "react";
import TaskBoard from "@/views/shared/TaskBoard";
import { auth } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function TodayLogs() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time

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
      initialDate={today} 
      title="Today's Tasks" 
      subtitle={
        role === "master_admin" 
          ? `Global enterprise overview for ${today}.` 
          : role === "admin" 
            ? `Assignments and tasks relevant to your team for ${today}.` 
            : `Your active assignments scheduled for ${today}.`
      }
      hideTabs={role === "employee"}
    />
  );
}