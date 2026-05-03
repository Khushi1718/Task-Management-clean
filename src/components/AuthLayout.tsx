import { ReactNode } from "react";
import { Link } from "@/lib/router";
import { ShieldCheck, Zap, BarChart3 } from "lucide-react";
import logo from "@/assests/Experience_my_India.webp";
import { ThemeToggle } from "./theme-toggle";

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Elegant ambient glow */}
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />

        <Link to="/" className="relative z-10 flex items-center gap-2">
          <img 
            src={logo.src} 
            alt="Experience My India Logo" 
            className="h-16 w-auto object-contain bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10" 
          />
        </Link>

        <div className="relative z-10 max-w-md space-y-10">
          <div>
            <h2 className="text-4xl font-light tracking-tight text-white mb-4">
              Streamline your <br />
              <span className="font-semibold text-primary/90">daily workflow.</span>
            </h2>
            <p className="text-base text-zinc-400 leading-relaxed">
              A private, distraction-free environment to log your daily tasks, track progress, and stay perfectly aligned with the team.
            </p>
          </div>
          
          <div className="grid gap-6">
            {[
              { icon: Zap, t: "Frictionless Updates", d: "Log your daily progress in seconds." },
              { icon: BarChart3, t: "Clear Visibility", d: "Real-time insights without the meetings." },
              { icon: ShieldCheck, t: "Secure & Private", d: "Internal enterprise-grade access control." },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{f.t}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs font-medium text-zinc-600">
          © {new Date().getFullYear()} Experience My India Inc.
        </p>
      </div>

      {/* Right panel */}
      <div className="relative flex flex-col bg-transparent">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.src} alt="Experience My India Logo" className="h-12 w-auto object-contain dark:bg-white/95 dark:px-3 dark:py-1.5 dark:rounded-xl transition-all" />
          </Link>
          <ThemeToggle />
        </div>
        <div className="absolute right-4 top-4 hidden lg:block">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8 md:px-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
