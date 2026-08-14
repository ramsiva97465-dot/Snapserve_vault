import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, Plus } from "lucide-react";
import api from "@/lib/api";
import { Document } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";
import { toast } from "sonner";

export default function CompletedPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/documents", { params: { status: "COMPLETED" } })
      .then((r) => setDocs(r.data.documents))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-950">Completed</h1>
        <p className="text-surface-500 text-sm mt-1">View and download your signed documents.</p>
      </div>
      {loading ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-20 rounded-xl bg-surface-200 animate-pulse"/>)}</div> :
       docs.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-16 text-center">
          <CheckCircle2 size={40} className="text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700 mb-2">No completed documents</h3>
          <p className="text-sm text-surface-400">Send documents for signature to see them here.</p>
        </div>
       ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc)=>(
            <div key={doc.id} className="bg-white rounded-xl border border-emerald-200 shadow-card hover:shadow-card-hover transition-shadow p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-900 truncate">{doc.title}</p>
                  <p className="text-xs text-surface-400">{formatDate(doc.updatedAt)}</p>
                </div>
              </div>
              <div className="flex -space-x-1 mb-4">
                {doc.signers?.map((s,i)=>(
                  <div key={s.id} className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-700 text-[8px] font-bold">
                    {getInitials(s.name)}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Link to={`/documents/${doc.id}`} className="flex-1 text-center py-2 rounded-lg border border-surface-300 hover:bg-surface-50 text-sm font-medium text-surface-700">View</Link>
                {doc.signedFileUrl && (
                  <a href={doc.signedFileUrl} download className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                    <Download size={14}/> PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
       )}
    </div>
  );
}
