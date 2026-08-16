import { Copy, ExternalLink, X, Check, Mail, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

interface SigningLink {
  signer: { id: string; name: string; email: string; phone?: string };
  token: string;
  signingUrl: string;
}

interface Props {
  links: SigningLink[];
  documentId?: string;
  documentTitle?: string;
  onClose: () => void;
}

export default function SigningLinksModal({ links, documentId, documentTitle, onClose }: Props) {
  const { user: currentUser } = useAuthStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({});
  const [fromEmails, setFromEmails] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    links.forEach((l) => {
      initial[l.signer.id] = currentUser?.email || "ramsiva97465@gmail.com";
    });
    return initial;
  });
  const [emailAddresses, setEmailAddresses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    links.forEach((l) => {
      if (l.signer.email) initial[l.signer.id] = l.signer.email;
    });
    return initial;
  });

  const getCleanUrl = (url: string) => {
    if (!url) return "";
    let clean = url.trim();
    if (clean.startsWith("*")) {
      clean = clean.substring(1);
    }
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    }
    if (!clean.startsWith("/")) {
      clean = "/" + clean;
    }
    return `${window.location.origin}${clean}`;
  };

  const copyLink = async (rawUrl: string, id: string) => {
    const url = getCleanUrl(rawUrl);
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendEmail = async (signerId: string, fromEmail: string, toEmail: string, signingUrl: string) => {
    if (!toEmail || !toEmail.includes("@")) {
      toast.error("Please enter a valid customer email address (To).");
      return;
    }
    setSendingEmailId(signerId);
    try {
      if (documentId) {
        await api.post(`/documents/${documentId}/share`, {
          shareType: "EMAIL",
          senderEmail: fromEmail,
          recipientEmail: toEmail,
          shareUrl: signingUrl,
          message: `Please sign document "${documentTitle || "Document"}": ${signingUrl}`,
        });
      }
      toast.success(`Automated email template dispatched to ${toEmail}!`);
    } catch {
      toast.error("Failed to send email.");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleOpenWhatsApp = (phone: string, signingUrl: string) => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const title = documentTitle || "Document";
    const text = encodeURIComponent(
      `📄 Hello! Please review and sign the document "${title}": ${signingUrl}`
    );
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp chat...");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-lg animate-scale-in max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-100 bg-surface-50">
          <div>
            <h2 className="text-lg font-bold text-surface-950">Document Sent!</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Send invitations instantly via Email or WhatsApp.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Check size={16} className="text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-800 font-medium">
              {links.length} signing link{links.length !== 1 ? "s" : ""} generated & ready for dispatch.
            </p>
          </div>

          {links.map((link, i) => {
            const isOwner =
              link.signer.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
              link.signer.name?.toLowerCase() === currentUser?.name?.toLowerCase() ||
              (i === 0 && link.signer.name.toUpperCase().includes("SIVARAM"));

            const currentEmail = emailAddresses[link.signer.id] ?? link.signer.email ?? "";
            const currentPhone = phoneNumbers[link.signer.id] ?? link.signer.phone ?? "";
            const cleanSigningUrl = getCleanUrl(link.signingUrl);

            return (
              <div key={link.signer.id} className="rounded-xl border border-surface-200 p-4 space-y-3 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                    {getInitials(link.signer.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-900">{link.signer.name}</p>
                      {isOwner && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> Owner (You)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400">{link.signer.email}</p>
                  </div>
                  <span className="ml-auto text-[11px] bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full font-medium">
                    Signer {i + 1}
                  </span>
                </div>

                {!isOwner ? (
                  <div className="space-y-2.5 pt-2 border-t border-surface-100">
                    {/* Copy Link Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200 font-mono text-[11px] text-surface-600 truncate">
                        {cleanSigningUrl}
                      </div>
                      <button
                        onClick={() => copyLink(cleanSigningUrl, link.signer.id)}
                        className="p-1.5 rounded-lg border border-surface-300 hover:bg-surface-50 text-surface-600 hover:text-surface-900 transition-colors flex-shrink-0"
                        title="Copy link"
                      >
                        {copiedId === link.signer.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <a
                        href={cleanSigningUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-surface-300 hover:bg-surface-50 text-surface-600 hover:text-surface-900 transition-colors flex-shrink-0"
                        title="Open link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {/* 2 Dispatch Options: Email & WhatsApp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {/* Option 1 — Email */}
                      <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <Mail size={13} className="text-blue-600" />
                          <span>1. Email Dispatch</span>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-0.5">From (Sender)</label>
                          <input
                            type="email"
                            value={fromEmails[link.signer.id] ?? (currentUser?.email || "ramsiva97465@gmail.com")}
                            onChange={(e) =>
                              setFromEmails((prev) => ({ ...prev, [link.signer.id]: e.target.value }))
                            }
                            placeholder="Sender Gmail"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-blue-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-0.5">To (Customer)</label>
                          <input
                            type="email"
                            value={currentEmail}
                            onChange={(e) =>
                              setEmailAddresses((prev) => ({ ...prev, [link.signer.id]: e.target.value }))
                            }
                            placeholder="Customer Gmail"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-blue-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() =>
                            handleSendEmail(
                              link.signer.id,
                              fromEmails[link.signer.id] ?? (currentUser?.email || "ramsiva97465@gmail.com"),
                              currentEmail,
                              cleanSigningUrl
                            )
                          }
                          disabled={sendingEmailId === link.signer.id}
                          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 mt-1"
                        >
                          {sendingEmailId === link.signer.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send size={12} /> Send Email
                            </>
                          )}
                        </button>
                      </div>

                      {/* Option 2 — WhatsApp */}
                      <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <MessageSquare size={13} className="text-emerald-600" />
                          <span>2. WhatsApp Dispatch</span>
                        </div>
                        <input
                          type="tel"
                          value={currentPhone}
                          onChange={(e) =>
                            setPhoneNumbers((prev) => ({ ...prev, [link.signer.id]: e.target.value }))
                          }
                          placeholder="Client Mobile Number"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          onClick={() => handleOpenWhatsApp(currentPhone, cleanSigningUrl)}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <MessageSquare size={12} /> Send WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-700 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Your signature & details have been saved directly to the document.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-100 bg-surface-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-surface-950 hover:bg-surface-800 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
