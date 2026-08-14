import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import api from "@/lib/api";
import Logo from "@/components/layout/Logo";

const schema = z.object({ email: z.string().email("Invalid email address") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-100">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-8"><Logo variant="sidebar" /></div>

        {!sent ? (
          <div className="bg-white rounded-2xl p-8 shadow-card border border-surface-200">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-surface-950 mb-1.5">Reset password</h1>
              <p className="text-surface-500 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Email address</label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="you@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Send reset link"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-card border border-surface-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-surface-950 mb-2">Check your inbox</h2>
            <p className="text-surface-500 text-sm mb-1">
              We&apos;ve sent a reset link to:
            </p>
            <p className="text-surface-800 font-medium text-sm mb-6">{getValues("email")}</p>
            <p className="text-surface-400 text-xs">Didn&apos;t receive it? Check your spam folder.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 transition-colors">
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
