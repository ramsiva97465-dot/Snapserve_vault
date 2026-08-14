import { cn, getStatusLabel, getStatusColor } from "@/lib/utils";
import { DocumentStatus } from "@/types";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
        getStatusColor(status),
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
