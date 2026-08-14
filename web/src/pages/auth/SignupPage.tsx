import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight, User as UserIcon,
  Phone, Building2, CheckCircle2, Sparkles, Shield
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(8, "Valid phone number required"),
  email: z.string().email("Invalid email / Gmail address"),
  organizationName: z.string().min(2, "Workspace / Company name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { signup, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await signup({
        name: data.name,
        email: data.email,
        password: data.password,
        organizationName: data.organizationName,
      });
      toast.success("Account created successfully! Welcome to Snapserve Vault.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Sign up failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#090d16] font-sans antialiased text-slate-100 overflow-hidden">
      
      {/* ─── LEFT HERO PANEL (Desktop 50%) ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[50%] relative flex-col justify-between p-12 xl:p-16 border-r border-slate-800/60 bg-gradient-to-br from-[#0c1220] via-[#090d16] to-[#060911]">
        
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Logo */}
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
            Free Instant Account Setup
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Multi-Member Setup
            </div>
            
            <h1 className="font-display text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.12]">
              Create your personal <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                Secure Vault Account.
              </span>
            </h1>
            
            <p className="text-slate-400 text-base leading-relaxed">
              Register with your Name, Mobile Number, and Gmail. Manage your own documents or collaborate with team members seamlessly.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="space-y-3 pt-2 text-sm text-slate-300">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Independent Personal Account & Isolated Document Storage</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
              <span>Automated Email Notifications for Signature Requests</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Invite up to 5 Team Members to Collaborate</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>© 2026 Snapserve.ai Vault Inc.</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> Bank-Grade 256-Bit SSL Protected
          </span>
        </div>

      </div>

      {/* ─── RIGHT SIGNUP FORM PANEL (Desktop 50%) ──────────────────────── */}
      <div className="w-full lg:w-[50%] flex flex-col justify-between p-6 sm:p-10 xl:p-12 bg-[#090d16] relative overflow-y-auto">
        
        {/* Navigation */}
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">Snapserve<span className="text-blue-400">.ai</span></span>
          </Link>

          <div className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>

        {/* Signup Form */}
        <div className="my-auto py-6 max-w-md w-full mx-auto space-y-6">
          
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create your account
            </h2>
            <p className="text-slate-400 text-sm">
              Enter your details below to set up your personal workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  {...register("name")}
                  type="text"
                  placeholder="Sivaram R S"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
              {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
            </div>

            {/* Mobile Number & Email (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                {errors.phone && <p className="text-xs text-rose-400">{errors.phone.message}</p>}
              </div>

              {/* Gmail / Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Gmail / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="you@gmail.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
              </div>

            </div>

            {/* Workspace / Company Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Workspace / Organization Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  {...register("organizationName")}
                  type="text"
                  placeholder="My Vault Workspace"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
              {errors.organizationName && <p className="text-xs text-rose-400">{errors.organizationName.message}</p>}
            </div>

            {/* Passwords (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 chars"
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <input
                  {...register("confirmPassword")}
                  type="password"
                  placeholder="Repeat pass"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                {errors.confirmPassword && <p className="text-xs text-rose-400">{errors.confirmPassword.message}</p>}
              </div>

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Vault Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-slate-300 underline hover:text-white">Terms</Link> and{" "}
              <Link to="/privacy" className="text-slate-300 underline hover:text-white">Privacy Policy</Link>.
            </p>
          </div>

        </div>

        {/* Mobile Footer */}
        <div className="text-center text-xs text-slate-400 lg:hidden">
          © 2026 Snapserve.ai Vault Inc.
        </div>

      </div>

    </div>
  );
}
