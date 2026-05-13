import React, { ReactNode, useState, useEffect, useMemo, memo } from "react";
import Image from "next/image";

import { NavLink } from "@/components/NavLink";
import { Link, useLocation, useNavigate } from "@/lib/router";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  Menu,
  PlusCircle,
  Search,
  Settings,
  User as UserIcon,
  Users,
  CalendarClock,
  ClipboardList,
  Activity,
  LogOut,
  MessageSquare,
  BarChart3,
  TrendingUp,
  History,
  Briefcase,
} from "lucide-react";
import logo from "@/assests/Experience_my_India.webp";
import { ThemeToggle } from "./theme-toggle";
import { NotificationCenter } from "./NotificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";


type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const employeeNav: NavItem[] = [
  { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employee/projects", label: "My Projects", icon: Briefcase },
  { to: "/employee/today", label: "Today's Tasks", icon: Activity },
  { to: "/employee/tasks", label: "Task Board", icon: ClipboardList },
  { to: "/employee/messages", label: "Messages", icon: MessageSquare },
  { to: "/employee/profile", label: "Profile", icon: UserIcon },
];

const adminNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/projects", label: "Projects", icon: Briefcase },
  { to: "/admin/today", label: "Today's Tasks", icon: Activity },
  { to: "/admin/tasks", label: "Task Board", icon: ClipboardList },
  { to: "/admin/users", label: "All Users", icon: Users },
  { to: "/admin/seo-reports", label: "SEO Reports", icon: TrendingUp },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/profile", label: "Profile", icon: UserIcon },
];

const masterAdminNav: NavItem[] = [
  { to: "/master-admin/dashboard", label: "Global Intel", icon: LayoutDashboard },
  { to: "/master-admin/projects", label: "Project Hub", icon: Briefcase },
  { to: "/master-admin/today", label: "Today's Tasks", icon: Activity },
  { to: "/master-admin/tasks", label: "Enterprise Board", icon: ClipboardList },
  { to: "/master-admin/users", label: "All Users", icon: Users },
  { to: "/master-admin/seo-reports", label: "SEO Reports", icon: TrendingUp },
  { to: "/master-admin/admin-tasks", label: "Admin Inbox", icon: History },
  { to: "/master-admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/master-admin/profile", label: "My Profile", icon: UserIcon },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const SidebarNav = React.memo(({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) => {
  return (
    <nav className="flex flex-col gap-1 px-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent hover:border-sidebar-border/50"
          activeClassName="!bg-blue-600 !text-white shadow-xl shadow-blue-500/20 !border-blue-400/20"
        >
          <item.icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="truncate tracking-tight">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
});

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 px-6 py-8">
      <div className="relative group">
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Image 
          src={logo} 
          alt="Experience My India Logo" 
          className="relative h-12 w-auto object-contain dark:bg-white/95 dark:px-4 dark:py-2 dark:rounded-2xl dark:shadow-[0_0_25px_rgba(255,255,255,0.08)] transition-all group-hover:scale-[1.02]" 
          priority
        />
      </div>
    </Link>
  );
}


export function AppShell({
  role,
  children,
  title,
  subtitle,
  actions,
}: {
  role: "master_admin" | "admin" | "employee";
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const user = useAuthStore(state => state.user);
  const fetchProfile = useAuthStore(state => state.fetchProfile);
  const storeLogout = useAuthStore(state => state.logout);

  const activeRole = user?.role || role;
  const items = useMemo(() => 
    activeRole === "master_admin" ? masterAdminNav : activeRole === "admin" ? adminNav : employeeNav,
  [activeRole]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile().then(() => {
      if (!useAuthStore.getState().user && !useAuthStore.getState().isLoading) {
        navigate("/");
      }
    });
  }, [fetchProfile, navigate]);


  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/95 lg:flex backdrop-blur-md">
        <Brand />
        <div className="px-5 pb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            {activeRole === "master_admin" ? "Systems Control" : activeRole === "admin" ? "Management" : "Workspace"}
          </span>
        </div>
        <SidebarNav items={items} />
        <div className="mt-auto border-t border-sidebar-border/50 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-2 border border-border/5">
            <Avatar className="h-8 w-8 ring-1 ring-border/10">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold tracking-tight">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground font-medium">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar animate-in slide-in-from-left duration-300">
            <Brand />
            <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/40 bg-background/60 px-4 backdrop-blur-xl md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-1 h-10 gap-2.5 px-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/5 transition-all">
                  <Avatar className="h-7 w-7 ring-1 ring-border/10">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2 rounded-2xl border-border/50 shadow-2xl">
                <DropdownMenuLabel className="font-normal px-3 py-3">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-bold tracking-tight">{user.name}</span>
                    <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="opacity-50" />
                <DropdownMenuItem asChild className="rounded-lg h-10 px-3 cursor-pointer">
                  <Link to={activeRole === "master_admin" ? "/master-admin/profile" : activeRole === "admin" ? "/admin/profile" : "/employee/profile"}>
                    <UserIcon className="mr-3 h-4 w-4 opacity-70" /> <span className="text-xs font-bold">Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="opacity-50" />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer rounded-lg h-10 px-3"
                  onClick={() => {
                    storeLogout();
                    navigate("/");
                  }}

                >
                  <LogOut className="mr-3 h-4 w-4" /> <span className="text-xs font-bold">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page header */}
        {(title || subtitle || actions) && (
          <div className="border-b border-border/40 bg-background/40">
            <div className="flex flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-10">
              <div>
                {title && <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>}
                {subtitle && <p className="mt-1.5 text-xs font-medium text-muted-foreground/80 uppercase tracking-widest">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
          </div>
        )}

        <main className="px-4 py-8 md:px-10 md:py-10 animate-in fade-in duration-700">
          {children}
        </main>
      </div>
    </div>
  );
}
