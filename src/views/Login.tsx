import { useState, useEffect } from "react";
import Image from "next/image";

import { Link, useNavigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "@/assests/Experience_my_India.webp";
import { auth } from "@/lib/api";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, Globe, ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await auth.login(email, password);

      if (response.success && response.data) {
        setIsSuccess(true);
        toast.success("Identity verified. Accessing secure workspace...");

        const userRole = response.data.user?.role;
        setTimeout(() => {
          if (userRole === "master_admin") {
            navigate("/master-admin/dashboard");
          } else if (userRole === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/employee/dashboard");
          }
        }, 1200);
      } else {
        toast.error(response.message || "Authentication failed. Please check your credentials.");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Network synchronization failed. Ensure secure tunnel is active.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-zinc-950 font-sans selection:bg-primary/20 overflow-hidden">
      
      {/* LEFT SIDE: Brand Experience - 50% */}
      <div className="relative hidden w-1/2 flex-col justify-center bg-zinc-900 p-24 lg:flex overflow-hidden">
        {/* Advanced Background Layers */}
        <div className="absolute inset-0">
           <div className="absolute top-[-20%] left-[-10%] w-[100%] h-[100%] rounded-full bg-primary/20 blur-[150px] animate-pulse"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[120px]"></div>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]"></div>
           <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 via-zinc-900 to-black/80"></div>
        </div>
        
        {/* Subtle architectural grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:64px_64px]"></div>

        <div className="relative z-10 flex flex-col items-start max-w-lg">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
               <div className="h-1 w-12 bg-primary rounded-full"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Corporate Portal</span>
            </div>
            
            <h2 className="text-6xl xl:text-7xl font-black tracking-tighter text-white leading-[0.9] animate-in fade-in slide-in-from-left-8 duration-700">
              Your Compass<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 italic font-serif">to Operational</span><br />
              Excellence.
            </h2>
            
            <p className="text-xl text-zinc-400 font-medium leading-relaxed opacity-90 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              Welcome to the Experience My India internal workspace. Streamlining travel operations, task management, and team productivity.
            </p>

            <div className="pt-8 grid grid-cols-2 gap-10 border-t border-white/5 animate-in fade-in duration-1000 delay-500">
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <Compass className="h-4 w-4 text-primary" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mission</p>
                  </div>
                  <p className="text-sm font-bold text-white">Seamless Travel Operations</p>
               </div>
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <Shield className="h-4 w-4 text-primary" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Security</p>
                  </div>
                  <p className="text-sm font-bold text-white">Encrypted Data Management</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Engine - 50% */}
      <div className="relative flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-24 xl:px-40 bg-background">
        
        <div className="relative z-10 mx-auto w-full max-w-[420px] animate-in fade-in slide-in-from-right-8 duration-700">
          
          {/* subtle Logo Header */}
          <div className="mb-12 text-center lg:text-left">
            <div style={{ backgroundColor: '#ffffff' }} className="inline-block p-4 rounded-[2rem] border border-zinc-100 dark:border-white/5 mb-8 hover:scale-105 transition-transform duration-500">
               <Image 
                 src={logo} 
                 alt="Experience My India" 
                 className="h-10 w-auto object-contain" 
                 priority
               />
            </div>

            <h1 className="text-4xl font-black tracking-tight text-foreground mb-4">Account Login</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
               Authorized access for Experience My India team members.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1">
                Corporate Email
              </label>
              <div className="relative group">
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@experiencemyindia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  disabled={isSubmitting || isSuccess}
                  className="h-14 rounded-2xl border-border bg-zinc-50 dark:bg-zinc-900/50 px-5 text-base font-medium transition-all focus:ring-4 focus:ring-primary/10 focus:border-primary group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900" 
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Security Key
                  </label>
              </div>
              <div className="relative group">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  disabled={isSubmitting || isSuccess}
                  className="h-14 rounded-2xl border-border bg-zinc-50 dark:bg-zinc-900/50 px-5 pr-14 text-base font-medium transition-all focus:ring-4 focus:ring-primary/10 focus:border-primary group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 ml-1">
              <input type="checkbox" id="remember" className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background transition-all cursor-pointer" />
              <label htmlFor="remember" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                 Trust this device for 30 days
              </label>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || isSuccess}
              className={cn(
                "group relative h-15 w-full overflow-hidden rounded-[1.25rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500",
                isSuccess 
                  ? "bg-success text-white hover:bg-success shadow-success/20" 
                  : "bg-zinc-900 dark:bg-primary text-white hover:bg-zinc-800 dark:hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : isSuccess ? (
                <div className="flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Access Verified</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                   <span>Secure Login</span>
                   <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-20 text-center">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-50">
                © {new Date().getFullYear()} Experience My India
             </p>
          </div>

        </div>
      </div>
      
    </div>
  );
}
