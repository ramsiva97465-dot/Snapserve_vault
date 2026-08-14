import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2,
  Sparkles, FileText, BadgeCheck, Shield, RefreshCw
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both your email address and password.");
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back to Snapserve Vault!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    setEmail("ramsiva97465@gmail.com");
    setPassword("password123");
    toast.info("Demo credentials loaded! Click Sign In to proceed.");
  };

  return (
    <div className="min-h-screen w-full flex bg-[#090d16] font-sans antialiased text-slate-100 overflow-hidden">
      
      {/* ─── LEFT HERO SECURITY PANEL (Desktop 55%) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 xl:p-16 border-r border-slate-800/60 bg-gradient-to-br from-[#0c1220] via-[#090d16] to-[#060911]">
        
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Snapserve<span className="text-blue-400 font-extrabold">.ai</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Vault Security</span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SOC-2 Type II Certified
          </div>
        </div>

        {/* Hero Copy & Visual Card */}
        <div className="relative z-10 my-auto py-8 space-y-10 max-w-xl">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen e-Signature Vault
            </div>
            
            <h1 className="font-display text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.12]">
              Sign documents with <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                100% legal confidence.
              </span>
            </h1>
            
            <p className="text-slate-400 text-base xl:text-lg leading-relaxed">
              Automated field presets, bank-grade 256-bit AES encryption, and instant tamper-evident audit logging for enterprise teams.
            </p>
          </div>

          {/* Floating Glass Signature Mock Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4 transform transition-all hover:border-slate-700/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Employment_Agreement_2026.pdf</h4>
                  <span className="text-xs text-slate-400">146.5 KB • 256-Bit AES Encrypted</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                Encrypted
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">Verified Signature (Vault Owner)</span>
              </div>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                ✓ SHA-256 Audit Passed
              </span>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-800/60 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>eIDAS & ESIGN</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>256-Bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Real-Time Audit</span>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>© 2026 Snapserve.ai Vault Inc.</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> Bank-Grade Security Standards
          </span>
        </div>

      </div>

      {/* ─── RIGHT WORKSPACE FORM PANEL (Desktop 45%) ───────────────────────── */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-12 xl:p-16 bg-[#090d16] relative overflow-y-auto">
        
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">Snapserve<span className="text-blue-400">.ai</span></span>
          </Link>

          <div className="text-sm text-slate-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors underline underline-offset-4">
              Sign up free
            </Link>
          </div>
        </div>

        {/* Center Form Card */}
        <div className="my-auto py-8 max-w-md w-full mx-auto space-y-8">
          
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-slate-400 text-sm">
              Enter your credentials to access your Snapserve Vault workspace.
            </p>
          </div>

          {/* Quick Demo Fill Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/20 flex items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-md bg-blue-500/20 text-blue-400">⚡</span>
              <div>
                <span className="font-semibold text-white">Quick Demo Mode</span>
                <p className="text-slate-400 text-[11px]">Fill 1-click test credentials</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" /> Auto-fill
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="sign-in-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Snapserve Vault</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Security Guarantee Note */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              Protected by 256-bit SSL encryption. By signing in, you accept our{" "}
              <Link to="/terms" className="text-slate-300 underline hover:text-white">Terms</Link> and{" "}
              <Link to="/privacy" className="text-slate-300 underline hover:text-white">Privacy Policy</Link>.
            </p>
          </div>

        </div>

        {/* Bottom Mobile Footer */}
        <div className="text-center text-xs text-slate-400 lg:hidden">
          © 2026 Snapserve.ai Vault Inc.
        </div>

      </div>

    </div>
  );
}
