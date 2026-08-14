import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, Clock } from "lucide-react";
import api from "@/lib/api";
import { AuditLog } from "@/types";
import { formatDateTime, getAuditLabel } from "@/lib/utils";
import { toast } from "sonner";

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_CREATED: "bg-brand-100 text-brand-700",
  DOCUMENT_UPLOADED: "bg-blue-100 text-blue-700",
  DOCUMENT_SENT: "bg-indigo-100 text-indigo-700",
  DOCUMENT_VIEWED: "bg-purple-100 text-purple-700",
  DOCUMENT_SIGNED: "bg-emerald-100 text-emerald-700",
  DOCUMENT_COMPLETED: "bg-emerald-200 text-emerald-800",
  TERMS_ACCEPTED: "bg-amber-100 text-amber-700",
  FIELD_COMPLETED: "bg-teal-100 text-teal-700",
  SIGNING_LINK_OPENED: "bg-violet-100 text-violet-700",
  REMINDER_SENT: "bg-orange-100 text-orange-700",
};

export default function DocumentActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/audit/${id}`);
        setLogs(res.data);
      } catch { toast.error("Failed to load activity."); }
      finally { setLoading(false); }
    };
    fetchLogs();
  }, [id]);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      <Link to={`/documents/${id}`} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-6">
        <ArrowLeft size={15} /> Document
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-950 flex items-center gap-2">
          <Activity size={22} /> Audit Trail
        </h1>
        <p className="text-surface-500 text-sm mt-1">Complete history of all actions on this document.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-200 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <Clock size={40} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-400">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-200" />
          <div className="space-y-4">
            {logs.map((log, i) => (
              <div key={log.id} className="flex gap-4 relative animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-white ${ACTION_COLORS[log.action] || "bg-surface-100 text-surface-600"}`}>
                  <Activity size={14} />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-surface-200 shadow-card p-4 -mt-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-sm font-semibold text-surface-900">
                        {log.actorName || "System"}
                      </p>
                      <p className="text-sm text-surface-600">{getAuditLabel(log.action)}</p>
                    </div>
                    <time className="text-xs text-surface-400 whitespace-nowrap flex-shrink-0">
                      {formatDateTime(log.createdAt)}
                    </time>
                  </div>
                  {log.actorEmail && log.actorEmail !== log.actorName && (
                    <p className="text-xs text-surface-400">{log.actorEmail}</p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1.5 text-xs text-surface-400 bg-surface-50 rounded px-2 py-1 font-mono">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                  {log.ipAddress && (
                    <p className="text-[10px] text-surface-300 mt-1">IP: {log.ipAddress}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
