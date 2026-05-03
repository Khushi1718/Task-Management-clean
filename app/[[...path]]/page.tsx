"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Loading component for code-split views
const LoadingView = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">
        Accessing Secure Node...
      </p>
    </div>
  </div>
);

// Dynamic imports for all views (Code Splitting)
const Login = dynamic(() => import("@/views/Login"), { loading: () => <LoadingView /> });
const NotFound = dynamic(() => import("@/views/NotFound"), { loading: () => <LoadingView /> });
const EmployeeDashboard = dynamic(() => import("@/views/employee/Dashboard"), { loading: () => <LoadingView /> });
const AddLog = dynamic(() => import("@/views/employee/AddLog"), { loading: () => <LoadingView /> });
const LogDetail = dynamic(() => import("@/views/employee/LogDetail"), { loading: () => <LoadingView /> });
const EmployeeProfile = dynamic(() => import("@/views/employee/Profile"), { loading: () => <LoadingView /> });
const AdminDashboard = dynamic(() => import("@/views/admin/Dashboard"), { loading: () => <LoadingView /> });
const AllUsers = dynamic(() => import("@/views/admin/AllUsers"), { loading: () => <LoadingView /> });
const UserDetail = dynamic(() => import("@/views/admin/UserDetail"), { loading: () => <LoadingView /> });
const TodayLogs = dynamic(() => import("@/views/admin/TodayLogs"), { loading: () => <LoadingView /> });
const AllLogs = dynamic(() => import("@/views/admin/AllLogs"), { loading: () => <LoadingView /> });
const SEOReports = dynamic(() => import("@/views/admin/SEOReports"), { loading: () => <LoadingView /> });
const SEODetail = dynamic(() => import("@/views/admin/SEODetail"), { loading: () => <LoadingView /> });
const ActivityLogs = dynamic(() => import("@/views/admin/ActivityLogs"), { loading: () => <LoadingView /> });
const AdminProfile = dynamic(() => import("@/views/admin/Profile"), { loading: () => <LoadingView /> });
const Messaging = dynamic(() => import("@/views/shared/Messaging"), { loading: () => <LoadingView /> });
const Notifications = dynamic(() => import("@/views/shared/Notifications"), { loading: () => <LoadingView /> });
const Projects = dynamic(() => import("@/views/shared/Projects"), { loading: () => <LoadingView /> });
const ProjectDetail = dynamic(() => import("@/views/shared/ProjectDetail"), { loading: () => <LoadingView /> });
const MasterAdminDashboard = dynamic(() => import("@/views/master-admin/Dashboard"), { loading: () => <LoadingView /> });
const TaskBoard = dynamic(() => import("@/views/shared/TaskBoard"), { loading: () => <LoadingView /> });



export default function Page() {
  const pathname = usePathname();

  // Root
  if (pathname === "/") return <Login />;

  // Employee Routes
  if (pathname === "/employee/dashboard") return <EmployeeDashboard />;
  if (pathname === "/employee/projects") return <Projects role="employee" />;
  if (pathname.startsWith("/employee/projects/")) return <ProjectDetail role="employee" />;
  if (pathname === "/employee/today") return <TodayLogs />;
  if (pathname === "/employee/tasks") return <AllLogs />;
  if (pathname === "/employee/add-log") return <AddLog />;
  if (pathname.startsWith("/employee/logs/edit/")) return <AddLog />;
  if (pathname === "/employee/logs") return <AllLogs />;
  if (pathname.startsWith("/employee/logs/")) return <LogDetail />;
  if (pathname === "/employee/profile") return <EmployeeProfile />;
  if (pathname === "/employee/messages") return <Messaging />;

  // Admin Routes
  if (pathname === "/admin/dashboard") return <AdminDashboard />;
  if (pathname === "/admin/projects") return <Projects role="admin" />;
  if (pathname.startsWith("/admin/projects/")) return <ProjectDetail role="admin" />;
  if (pathname === "/admin/tasks") return <AllLogs />;
  if (pathname === "/admin/users") return <AllUsers />;
  if (pathname.startsWith("/admin/users/")) return <UserDetail />;
  if (pathname === "/admin/today") return <TodayLogs />;
  if (pathname === "/admin/logs") return <AllLogs />;
  if (pathname === "/admin/seo-reports") return <SEOReports />;
  if (pathname.startsWith("/admin/seo-reports/")) return <SEODetail />;
  if (pathname.startsWith("/admin/logs/")) return <LogDetail />;
  if (pathname === "/admin/activity") return <ActivityLogs />;
  if (pathname === "/admin/profile") return <AdminProfile />;
  if (pathname === "/admin/messages") return <Messaging />;

  // Master Admin Routes
  if (pathname === "/master-admin/dashboard") return <MasterAdminDashboard />;
  if (pathname === "/master-admin/projects") return <Projects role="master_admin" />;
  if (pathname.startsWith("/master-admin/projects/")) return <ProjectDetail role="master_admin" />;
  if (pathname === "/master-admin/tasks") return <AllLogs />;
  if (pathname === "/master-admin/users") return <AllUsers />;
  if (pathname.startsWith("/master-admin/users/")) return <UserDetail />;
  if (pathname === "/master-admin/today") return <TodayLogs />;
  if (pathname === "/master-admin/logs") return <AllLogs />;
  if (pathname === "/master-admin/seo-reports") return <SEOReports />;
  if (pathname.startsWith("/master-admin/seo-reports/")) return <SEODetail />;
  if (pathname === "/master-admin/profile") return <AdminProfile />;
  if (pathname === "/master-admin/messages") return <Messaging />;

  // Shared
  if (pathname === "/notifications") return <Notifications />;

  return <NotFound />;
}
