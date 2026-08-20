import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { DocumentStatus, SignerStatus, SIGNER_COLORS } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    DRAFT: "Draft",
    PREPARING: "Preparing",
    SENT: "Sent",
    VIEWED: "Viewed",
    PARTIALLY_SIGNED: "Partially Signed",
    COMPLETED: "Completed",
    EXPIRED: "Expired",
    DECLINED: "Declined",
    CANCELLED: "Cancelled",
  };
  return labels[status] || status;
}

export function getStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    PREPARING: "bg-blue-50 text-blue-600",
    SENT: "bg-indigo-50 text-indigo-600",
    VIEWED: "bg-purple-50 text-purple-600",
    PARTIALLY_SIGNED: "bg-amber-50 text-amber-600",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    EXPIRED: "bg-orange-50 text-orange-600",
    DECLINED: "bg-red-50 text-red-600",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}

export function getSignerStatusColor(status: SignerStatus): string {
  const colors: Record<SignerStatus, string> = {
    PENDING: "bg-gray-100 text-gray-500",
    SENT: "bg-indigo-50 text-indigo-600",
    VIEWED: "bg-purple-50 text-purple-600",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    DECLINED: "bg-red-50 text-red-600",
  };
  return colors[status] || "bg-gray-100 text-gray-500";
}

export function getSignerColor(index: number): string {
  return SIGNER_COLORS[index % SIGNER_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getAuditLabel(action: string): string {
  const labels: Record<string, string> = {
    DOCUMENT_CREATED: "Document created",
    DOCUMENT_UPLOADED: "PDF uploaded",
    DOCUMENT_UPDATED: "Document updated",
    DOCUMENT_SENT: "Document sent for signing",
    DOCUMENT_VIEWED: "Document viewed",
    DOCUMENT_SIGNED: "Document signed",
    DOCUMENT_COMPLETED: "Document completed",
    DOCUMENT_EXPIRED: "Document expired",
    DOCUMENT_DECLINED: "Document declined",
    DOCUMENT_CANCELLED: "Document cancelled",
    DOCUMENT_DOWNLOADED: "Document downloaded",
    SIGNER_ADDED: "Signer added",
    SIGNER_REMOVED: "Signer removed",
    SIGNING_LINK_OPENED: "Signing link opened",
    SIGNING_LINK_REVOKED: "Signing link revoked",
    TERMS_ACCEPTED: "Terms & conditions accepted",
    FIELD_COMPLETED: "Field completed",
    SIGNATURE_ADDED: "Signature added",
    REMINDER_SENT: "Reminder sent",
    TEMPLATE_CREATED: "Template created",
  };
  return labels[action] || action;
}

export function getFieldRenderCoords(
  field: { x: number; y: number; width: number; height: number; containerWidth?: number; containerHeight?: number },
  pageSize: { width: number; height: number },
  scale: number
) {
  if (field.containerWidth && field.containerHeight && field.containerWidth > 0 && field.containerHeight > 0) {
    return {
      left: (field.x / field.containerWidth) * pageSize.width,
      top: (field.y / field.containerHeight) * pageSize.height,
      width: (field.width / field.containerWidth) * pageSize.width,
      height: (field.height / field.containerHeight) * pageSize.height,
    };
  }
  return {
    left: field.x * scale,
    top: field.y * scale,
    width: field.width * scale,
    height: field.height * scale,
  };
}

