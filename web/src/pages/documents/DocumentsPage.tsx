import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Plus, Search, Filter, Grid3X3, List, MoreHorizontal, FileText,
  Trash2, Edit3, Send, Download, Copy, Eye, RefreshCw, ChevronDown,
  SlidersHorizontal, X
} from "lucide-react";
import api from "@/lib/api";
import { Document, DocumentStatus } from "@/types";
import StatusBadge from "@/components/document/StatusBadge";
import { formatDate, formatFileSize, getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUSES: { value: DocumentStatus | ""; label: string }[] = [
  { value: "", label: "All Documents" },
  { value: "DRAFT", label: "Drafts" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIALLY_SIGNED", label: "Partially Signed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DECLINED", label: "Declined" },
];

export default function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const urlStatus = (searchParams.get("status") || "") as DocumentStatus | "";
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocumentStatus | "">(urlStatus);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setStatus(urlStatus);
  }, [urlStatus]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get("/documents", { params });
      setDocs(res.data.documents);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Document deleted");
      fetchDocs();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleDuplicate = async (doc: Document) => {
    try {
      await api.post("/documents", { title: `${doc.title} (Copy)` });
      toast.success("Document duplicated");
      fetchDocs();
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const handleCreate = async () => {
    navigate("/documents/new");
  };

  const handleCreateQuickDemo = async () => {
    try {
      const res = await api.post("/documents", { title: "Sample Employment Agreement.pdf" });
      const docId = res.data.id;
      await api.post(`/documents/${docId}/upload`, new FormData());
      toast.success("Sample document created!");
      fetchDocs();
    } catch {
      toast.error("Failed to create sample document");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Documents</h1>
          <p className="text-surface-500 text-sm mt-1">Manage, send and track your documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateQuickDemo}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-surface-300 hover:bg-surface-100 text-surface-800 text-sm font-semibold transition-colors bg-white"
          >
            <RefreshCw size={15} className="text-brand-600" />
            + Quick Sample Doc
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus | "")}
            className="px-3 py-2 rounded-lg border border-surface-300 text-sm text-surface-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border border-surface-300 bg-white overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={cn("p-2 transition-colors", view === "list" ? "bg-surface-950 text-white" : "text-surface-400 hover:text-surface-700")}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn("p-2 transition-colors", view === "grid" ? "bg-surface-950 text-white" : "text-surface-400 hover:text-surface-700")}
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-200 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-surface-200">
          <FileText size={48} className="text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-800 mb-1">
            {search || status ? "No matching documents" : "No documents yet"}
          </h3>
          <p className="text-surface-400 text-sm mb-6">
            {search || status ? "Try a different filter." : "Upload your first document to get started."}
          </p>
          {!search && !status && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Upload Document
            </button>
          )}
        </div>
      ) : view === "list" ? (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden md:table-cell">Signers</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden lg:table-cell">Updated</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-brand-600" />
                      </div>
                      <div>
                        <Link
                          to={`/documents/${doc.id}`}
                          className="text-sm font-medium text-surface-900 hover:text-brand-600 transition-colors"
                        >
                          {doc.title}
                        </Link>
                        {doc.fileName && (
                          <p className="text-xs text-surface-400">{doc.fileName} · {formatFileSize(doc.fileSize)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      {doc.signers?.slice(0, 3).map((s, i) => (
                        <div key={s.id} className="w-6 h-6 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center -ml-1 first:ml-0">
                          <span className="text-[9px] font-bold text-brand-700">{getInitials(s.name)}</span>
                        </div>
                      ))}
                      {(doc.signers?.length ?? 0) > 3 && (
                        <span className="text-xs text-surface-500 ml-1">+{(doc.signers?.length ?? 0) - 3}</span>
                      )}
                      {(doc.signers?.length ?? 0) === 0 && <span className="text-xs text-surface-400">No signers</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-surface-400 hidden lg:table-cell">
                    {formatDate(doc.updatedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700"
                        title="Open"
                      >
                        <Eye size={15} />
                      </Link>
                      {(doc.status === "DRAFT" || doc.status === "PREPARING") && (
                        <Link
                          to={`/documents/${doc.id}/prepare`}
                          className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </Link>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                          className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenuId === doc.id && (
                          <div className="absolute right-0 top-8 w-44 bg-white rounded-lg border border-surface-200 shadow-modal z-10 py-1 animate-scale-in">
                            <button onClick={() => { handleDuplicate(doc); setOpenMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 hover:bg-surface-50">
                              <Copy size={14} /> Duplicate
                            </button>
                            <button onClick={() => { handleDelete(doc.id, doc.title); setOpenMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <p className="text-xs text-surface-400">{total} document{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map((doc) => (
            <Link
              key={doc.id}
              to={`/documents/${doc.id}`}
              className="bg-white rounded-xl border border-surface-200 shadow-card hover:shadow-card-hover transition-all p-4 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <FileText size={20} className="text-brand-600" />
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <h3 className="text-sm font-semibold text-surface-900 mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
                {doc.title}
              </h3>
              <p className="text-xs text-surface-400 mb-3">{formatDate(doc.updatedAt)}</p>
              <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                <div className="flex -space-x-1">
                  {doc.signers?.slice(0, 3).map((s) => (
                    <div key={s.id} className="w-5 h-5 rounded-full bg-brand-100 border border-white flex items-center justify-center">
                      <span className="text-[8px] font-bold text-brand-700">{getInitials(s.name)}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-surface-400">{doc.signers?.length ?? 0} signer{(doc.signers?.length ?? 0) !== 1 ? "s" : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
