import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark" | "sidebar";
  className?: string;
}

export default function Logo({ variant = "full", className }: LogoProps) {
  if (variant === "mark") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="24" height="3" rx="1.5" fill="#1c1917" />
          <rect x="4" y="14.5" width="20" height="3" rx="1.5" fill="#1c1917" />
          <rect x="4" y="21" width="16" height="3" rx="1.5" fill="#1c1917" />
        </svg>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <div className="flex flex-col gap-[3px] mt-0.5">
          <div className="w-[22px] h-[3px] rounded-full bg-surface-950" />
          <div className="w-[18px] h-[3px] rounded-full bg-surface-950" />
          <div className="w-[14px] h-[3px] rounded-full bg-surface-950" />
        </div>
        <div className="flex items-baseline gap-0">
          <span className="text-[15px] font-bold tracking-tight text-surface-950">Snapserve</span>
          <span className="text-[13px] font-medium text-brand-600">.ai</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex flex-col gap-1">
        <div className="w-7 h-[3.5px] rounded-full bg-surface-950" />
        <div className="w-5.5 h-[3.5px] rounded-full bg-surface-950" />
        <div className="w-4 h-[3.5px] rounded-full bg-surface-950" />
      </div>
      <div>
        <div className="text-xl font-bold tracking-tight text-surface-950 leading-none">
          Snapserve<span className="text-brand-600">.ai</span>
        </div>
        <div className="text-[10px] font-medium text-surface-600 tracking-widest uppercase leading-tight mt-0.5">
          Send · Sign · Done
        </div>
      </div>
    </div>
  );
}
