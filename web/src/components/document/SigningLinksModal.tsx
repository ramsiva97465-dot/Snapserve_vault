import { Copy, ExternalLink, X, Check, Link } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

interface SigningLink {
  signer: { id: string; name: string; email: string };
  token: string;
  signingUrl: string;
}

interface Props {
  links: SigningLink[];
  onClose: () => void;
}

export default function SigningLinksModal({ links, onClose }: Props) {
  const { user: currentUser } = useAuthStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <div>
            <h2 className="text-lg font-bold text-surface-950">Document Sent!</h2>
            <p className="text-sm text-surface-500 mt-0.5">Share these secure signing links with your signers.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-4">
            <Check size={16} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">
              {links.length} signing link{links.length !== 1 ? "s" : ""} generated. Each link is unique and secure.
            </p>
          </div>

          {links.map((link, i) => {
            const isOwner =
              link.signer.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
              link.signer.name?.toLowerCase() === currentUser?.name?.toLowerCase() ||
              (i === 0 && link.signer.name.toUpperCase().includes("SIVARAM"));

            return (
              <div key={link.signer.id} className="rounded-xl border border-surface-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                    {getInitials(link.signer.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-900">{link.signer.name}</p>
                      {isOwner && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> Owner (You - Signed)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400">{link.signer.email}</p>
                  </div>
                  <span className="ml-auto text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">
                    Signer {i + 1}
                  </span>
                </div>

                {!isOwner ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 font-mono text-xs text-surface-600 truncate">
                      {link.signingUrl}
                    </div>
                    <button
                      onClick={() => copyLink(link.signingUrl, link.signer.id)}
                      className="p-2 rounded-lg border border-surface-300 hover:bg-surface-50 text-surface-600 hover:text-surface-900 transition-colors flex-shrink-0"
                      title="Copy link"
                    >
                      {copiedId === link.signer.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    </button>
                    <a
                      href={link.signingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-surface-300 hover:bg-surface-50 text-surface-600 hover:text-surface-900 transition-colors flex-shrink-0"
                      title="Open link"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-700 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Your signature & details have been saved directly to the document.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
