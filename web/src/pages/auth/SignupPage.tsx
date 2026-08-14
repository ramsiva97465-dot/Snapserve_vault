import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Logo from "@/components/layout/Logo";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  organizationName: z.string().min(2, "Organization name is required"),
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
      toast.success("Account created! Welcome to Snapserve.ai");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Sign up failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-100">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo variant="sidebar" />
          </div>
          <h1 className="text-2xl font-bold text-surface-950 mb-1">Create your account</h1>
          <p className="text-surface-500 text-sm">Start signing documents in minutes. Free to get started.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-card border border-surface-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Full name</label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Gowri Shankar"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Work email</label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="you@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Organization name</label>
                <input
                  {...register("organizationName")}
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Acme Corp"
                />
                {errors.organizationName && <p className="mt-1 text-xs text-red-500">{errors.organizationName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Confirm password</label>
                <input
                  {...register("confirmPassword")}
                  type="password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Repeat password"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <p className="text-xs text-surface-400">
              By signing up, you agree to our{" "}
              <span className="text-brand-600 cursor-pointer hover:underline">Terms of Service</span> and{" "}
              <span className="text-brand-600 cursor-pointer hover:underline">Privacy Policy</span>.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold transition-all disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <> Create account <ArrowRight size={15} /> </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-surface-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
