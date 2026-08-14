import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Send, CheckCircle2, Clock, Plus, ArrowRight,
  Upload, Activity, FileStack
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { AnalyticsStats, AuditLog, Document } from "@/types";
import { formatRelative, getAuditLabel, cn, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/document/StatusBadge";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, docsRes] = await Promise.all([
          api.get("/analytics"),
          api.get("/documents?limit=5"),
        ]);
        setStats(analyticsRes.data.stats);
        setActivity(analyticsRes.data.recentActivity || []);
        setRecentDocs(docsRes.data.documents || []);
      } catch {
        setStats({ total: 0, sent: 0, completed: 0, drafts: 0, awaitingSignature: 0, expired: 0, completionRate: 0 });
        setRecentDocs([]);
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Total Documents", value: stats?.total ?? 0, icon: FileText, color: "text-brand-600", bg: "bg-brand-50", href: "/documents" },
    { label: "Awaiting Signature", value: stats?.awaitingSignature ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", href: "/sent" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", href: "/completed" },
    { label: "Drafts", value: stats?.drafts ?? 0, icon: FileStack, color: "text-surface-500", bg: "bg-surface-100", href: "/drafts" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">
            Welcome back, {user?.name || "Sivaram R S"} 👋
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Manage, send, and track your document e-signatures.
          </p>
        </div>
        <button
          onClick={() => navigate("/documents/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all shadow-sm"
        >
          <Plus size={16} />
          <span>New Document</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Link
            key={i}
            to={card.href}
            className="bg-white rounded-xl p-5 border border-surface-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", card.bg)}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-surface-950 mb-0.5">
              {loading ? <span className="inline-block w-8 h-7 bg-surface-100 rounded" /> : card.value}
            </div>
            <div className="text-xs text-surface-500 font-medium">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-surface-900">Recent Documents</h2>
            <Link to="/documents" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-surface-200 rounded-lg bg-surface-50/50">
              <FileText size={32} className="text-surface-300 mb-2" />
              <p className="text-sm font-medium text-surface-600">No documents created yet</p>
              <p className="text-xs text-surface-400 mt-1 mb-4">Upload a document to add fields and send for signing.</p>
              <button
                onClick={() => navigate("/documents/new")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all"
              >
                <Upload size={14} />
                <span>Upload PDF</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="flex items-center justify-between py-3 px-2 hover:bg-surface-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-surface-900 text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-surface-400">Updated {formatDate(doc.updatedAt)}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-surface-900">Recent Activity</h2>
            <Activity size={16} className="text-surface-400" />
          </div>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock size={24} className="text-surface-300 mb-2" />
              <p className="text-xs text-surface-400">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-surface-800 leading-snug">
                      <span className="font-medium">{log.actorName || "User"}</span>{" "}
                      {getAuditLabel(log.action).toLowerCase()}
                    </p>
                    {log.document && (
                      <p className="text-[11px] text-surface-400 truncate">{log.document.title}</p>
                    )}
                    <p className="text-[10px] text-surface-400">{formatRelative(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
