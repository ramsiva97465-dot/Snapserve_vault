import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileStack, Plus } from "lucide-react";
import api from "@/lib/api";
import { Document } from "@/types";
import StatusBadge from "@/components/document/StatusBadge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function DraftsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/documents", { params: { status: "DRAFT" } })
      .then((r) => setDocs(r.data.documents))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6"><h1 className="text-2xl font-bold text-surface-950">Drafts</h1><p className="text-surface-500 text-sm mt-1">Documents not yet sent.</p></div>
      {loading ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-16 rounded-xl bg-surface-200 animate-pulse"/>)}</div> :
       docs.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-16 text-center">
          <FileStack size={40} className="text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700 mb-2">No drafts</h3>
          <Link to="/documents/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-950 text-white text-sm font-semibold"><Plus size={15}/>Create Document</Link>
        </div>
       ) : (
        <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
          {docs.map((doc)=>(
            <Link key={doc.id} to={`/documents/${doc.id}/prepare`} className="flex items-center gap-4 px-5 py-4 border-b border-surface-50 hover:bg-surface-50 transition-colors">
              <FileStack size={18} className="text-surface-500 flex-shrink-0"/>
              <div className="flex-1 min-w-0"><p className="font-medium text-surface-900 truncate">{doc.title}</p><p className="text-xs text-surface-400">{formatDate(doc.updatedAt)}</p></div>
              <StatusBadge status={doc.status}/>
            </Link>
          ))}
        </div>
       )}
    </div>
  );
}
