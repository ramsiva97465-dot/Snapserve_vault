import * as React from "react";
import { Link } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm", className)} {...props} />
));
Card.displayName = "Card";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" fill="none" width="48" height="48" aria-label="Snapserve Logo" {...props}>
    <rect width="48" height="48" rx="12" fill="#0f172a" />
    <path d="M24 10L28.5 16H34L29.5 20.5L31 27L24 23L17 27L18.5 20.5L14 16H19.5L24 10Z" fill="#3b82f6" />
    <path d="M20 30L16 38H20L24 32L28 38H32L28 30L24 34L20 30Z" fill="#10b981" />
  </svg>
);

export default function Login06() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-sm rounded-3xl px-6 py-10 border border-slate-200 shadow-xl bg-white">
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            <Logo />
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Welcome back!</h1>
              <p className="text-slate-500 text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-slate-900 font-semibold hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>

            <form className="w-full space-y-3" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="user-email-input" className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <Input id="user-email-input" type="email" placeholder="Your email" className="w-full rounded-xl h-11" />
              <Button type="submit" className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 text-sm">
                Sign In
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400">
              By signing in, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-slate-900">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-slate-900">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
