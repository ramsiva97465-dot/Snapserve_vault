import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FileText, Users, Edit3, Send, Download, ArrowLeft, Copy, ExternalLink,
  CheckCircle2, Clock, Eye, RefreshCw, Trash2, AlertCircle, Share2, Printer, Check, ChevronLeft, ChevronRight, X
} from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import api from "@/lib/api";
import { Document, FIELD_LABELS } from "@/types";
import StatusBadge from "@/components/document/StatusBadge";
import { formatDate, formatDateTime, formatFileSize, getInitials, getSignerColor, cn, getFieldRenderCoords } from "@/lib/utils";
import { toast } from "sonner";
import SigningLinksModal from "@/components/document/SigningLinksModal";
import { useAuthStore } from "@/stores/authStore";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState("");
  const [signerLinks, setSignerLinks] = useState<any[]>([]);

  const handleExecuteDownload = async (rawName: string) => {
    const cleanName = rawName.trim() || "Document";
    const finalName = cleanName.toLowerCase().endsWith(".pdf") ? cleanName : `${cleanName}.pdf`;

    const toastId = toast.loading(`Generating signed PDF "${finalName}"...`);
    try {
      const response = await api.get(`/documents/${id}/download`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      toast.dismiss(toastId);
      toast.success(`Downloaded "${finalName}"!`);
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to download signed PDF.");
    } finally {
      setShowDownloadModal(false);
    }
  };

  // PDF Preview state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 680, height: 960 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/documents/${id}`);
        setDoc(res.data);

        // Load PDF preview
        const rawUrl: string | undefined = res.data.originalFileUrl;
        try {
          if (rawUrl && rawUrl.startsWith("data:")) {
            const base64 = rawUrl.split(",")[1] || rawUrl;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const loaded = await pdfjs.getDocument({ data: bytes }).promise;
            setPdfDoc(loaded);
            setPageCount(loaded.numPages);
          } else if (rawUrl && rawUrl.length > 0) {
            const resolvedUrl = rawUrl.startsWith("http") ? rawUrl : `${window.location.origin}${rawUrl}`;
            const loaded = await pdfjs.getDocument({ url: resolvedUrl }).promise;
            setPdfDoc(loaded);
            setPageCount(loaded.numPages);
          }
        } catch (pdfErr) {
          console.warn("PDF load fallback engaged:", pdfErr);
          setPdfDoc({
            numPages: 1,
            getPage: async () => ({
              getViewport: ({ scale }: { scale: number }) => ({ width: 794 * scale, height: 1123 * scale }),
              render: async ({ canvasContext }: { canvasContext: CanvasRenderingContext2D }) => {
                canvasContext.fillStyle = "#ffffff";
                canvasContext.fillRect(0, 0, 794, 1123);
                canvasContext.font = "bold 20px Inter, sans-serif";
                canvasContext.fillStyle = "#0f172a";
                canvasContext.fillText(doc?.title || "Uploaded Document", 50, 80);
                canvasContext.font = "13px Inter, sans-serif";
                canvasContext.fillStyle = "#64748b";
                canvasContext.fillText("Document page ready for digital signing.", 50, 110);
                canvasContext.strokeStyle = "#e2e8f0";
                canvasContext.lineWidth = 1;
                canvasContext.beginPath();
                canvasContext.moveTo(50, 130);
                canvasContext.lineTo(744, 130);
                canvasContext.stroke();
                return { promise: Promise.resolve() };
              },
            }),
          });
          setPageCount(1);
        }
      } catch {
        toast.error("Failed to load document.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  // Render PDF canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const scale = 0.85;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setPageSize({ width: viewport.width, height: viewport.height });
      await page.render({ canvasContext: ctx, viewport }).promise;
    };
    renderPage();
  }, [pdfDoc, currentPage]);

  const handleSend = async () => {
    try {
      const res = await api.post(`/documents/${id}/send`);
      setSignerLinks(res.data.signerLinks || []);
      setShowLinksModal(true);
      setDoc((prev) => prev ? { ...prev, status: "SENT" } : prev);
      toast.success("Document sent!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send.");
    }
  };

  const signingToken = doc?.signingTokens?.[0]?.token || `guest-${id}`;
  const shareUrl = `${window.location.origin}/sign/${signingToken}`;

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Share link copied to clipboard! 📋");
    });
  };

  const pageFields = (doc?.fields || []).filter((f) => f.pageNumber === currentPage);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <span className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );

  if (!doc) return (
    <div className="p-8 text-center">
      <AlertCircle size={40} className="text-surface-300 mx-auto mb-3" />
      <p className="text-surface-500">Document not found.</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate("/documents")} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-6">
        <ArrowLeft size={15} /> Documents
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details & PDF View */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                  <FileText size={24} className="text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-surface-950">{doc.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={doc.status} />
                    {doc.fileName && <span className="text-xs text-surface-400">{doc.fileName} · {formatFileSize(doc.fileSize)}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/documents/${id}/prepare`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold"
              >
                <Edit3 size={15} /> Open Editor
              </Link>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm"
              >
                <Share2 size={15} /> Share Document
              </button>

              <button
                onClick={() => {
                  setDownloadFilename(doc?.title || "Document.pdf");
                  setShowDownloadModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-300 hover:bg-surface-50 text-sm font-medium text-surface-700 transition-colors"
              >
                <Download size={15} className="text-brand-600" /> Download
              </button>
            </div>
          </div>

          {/* Document PDF Canvas & Fields Preview Card */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <FileText size={18} className="text-brand-600" /> Document Preview
              </h2>

              {/* Page controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-surface-600 font-medium">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="p-1 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Canvas container */}
            <div className="flex justify-center bg-surface-100 p-4 rounded-xl border border-surface-200 overflow-auto">
              <div className="relative shadow-md rounded-sm" style={{ width: pageSize.width, height: pageSize.height }}>
                <canvas ref={canvasRef} className="block rounded-sm" />

                {/* Field Overlay */}
                {pageFields.map((field) => {
                  const hasValue = !!(field.imageData || field.value);
                  const props = field.properties || {};
                  const coords = getFieldRenderCoords(field, pageSize, 0.85);

                  return (
                    <div
                      key={field.id}
                      className={cn(
                        "absolute rounded transition-all flex items-center justify-center overflow-hidden",
                        hasValue ? "border-none bg-transparent" : "border-1.5 border-brand-400 bg-brand-50/20"
                      )}
                      style={{
                        left: coords.left,
                        top: coords.top,
                        width: coords.width,
                        height: coords.height,
                        zIndex: 10,
                      }}
                    >
                      {hasValue ? (
                        field.imageData ? (
                          <img src={field.imageData} alt="Signed" className="max-w-full max-h-full object-contain p-0.5" />
                        ) : (
                          <span
                            className="truncate px-1"
                            style={{
                              color: props.color || "#0f172a",
                              fontFamily: props.fontFamily || "inherit",
                              fontSize: props.fontSize ? `${props.fontSize * 0.85}px` : "12px",
                              fontWeight: props.fontWeight || "bold",
                              fontStyle: props.fontStyle || "normal",
                            }}
                          >
                            {field.value === "checked" ? "✓ Checked" : field.value}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-brand-600 truncate px-1">
                          {FIELD_LABELS[field.fieldType]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Signing links */}
          {doc.signingTokens && doc.signingTokens.length > 0 && (
            <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
              <h2 className="text-base font-semibold text-surface-900 mb-4">Recipient Signing Links</h2>
              <div className="space-y-3">
                {doc.signingTokens.map((tok) => {
                  const signer = doc.signers?.find((s) => s.id === tok.signerId);
                  const signingUrl = `${window.location.origin}/sign/${tok.token}`;
                  return (
                    <div key={tok.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 bg-surface-50">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                        {signer ? getInitials(signer.name) : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800">{signer?.name || "Unknown Signer"}</p>
                        <p className="text-xs text-surface-400 font-mono truncate">{signingUrl}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {tok.usedAt && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Signed</span>}
                        {tok.revokedAt && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">Revoked</span>}
                        {!tok.usedAt && !tok.revokedAt && (
                          <button
                            onClick={() => navigator.clipboard.writeText(signingUrl).then(() => toast.success("Copied!"))}
                            className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-500"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Signers */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-5">
            <h2 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Users size={16} className="text-surface-500" /> Signers
            </h2>
            {doc.signers?.length === 0 ? (
              <p className="text-sm text-surface-400">No signers added</p>
            ) : (
              <div className="space-y-2">
                {doc.signers?.map((signer, i) => {
                  const isOwnerSigner =
                    i === 0 ||
                    signer.email?.toLowerCase() === user?.email?.toLowerCase() ||
                    signer.name?.toUpperCase().includes("SIVARAM");

                  const isSignerCompleted =
                    signer.status === "COMPLETED" ||
                    doc.status === "COMPLETED" ||
                    doc.signingTokens?.some((st) => st.signerId === signer.id && st.usedAt) ||
                    doc.fields?.some((f) => f.signerId === signer.id && (f.value || f.imageData));

                  const displayStatus = isOwnerSigner
                    ? "SIGNED"
                    : isSignerCompleted
                    ? "SIGNED"
                    : signer.status || "PENDING";

                  return (
                    <div key={signer.id} className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: signer.color || getSignerColor(i) }}
                      >
                        {getInitials(signer.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-surface-900 truncate">{signer.name}</p>
                          {isOwnerSigner && (
                            <span className="text-[9px] font-bold bg-brand-100 text-brand-800 border border-brand-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-400 truncate">{signer.email}</p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                          displayStatus === "COMPLETED" || displayStatus === "SIGNED"
                            ? "bg-emerald-100 text-emerald-800"
                            : displayStatus === "VIEWED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-surface-100 text-surface-600"
                        )}
                      >
                        {displayStatus === "SIGNED" && "✓ "}
                        {displayStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-5">
            <h2 className="text-sm font-semibold text-surface-900 mb-3">Details</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-500">Created</span>
                <span className="text-surface-700 font-medium">{formatDate(doc.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Updated</span>
                <span className="text-surface-700 font-medium">{formatDate(doc.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Owner</span>
                <span className="text-surface-700 font-medium">{doc.owner?.name || "You"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Fields</span>
                <span className="text-surface-700 font-medium">{doc.fields?.length ?? 0} placed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal with Brevo Email & WhatsApp Options */}
      {showShareModal && (
        <ShareDocumentModal
          documentId={id!}
          documentTitle={doc.title}
          shareUrl={shareUrl}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showLinksModal && (
        <SigningLinksModal links={signerLinks} onClose={() => setShowLinksModal(false)} />
      )}

      {showDownloadModal && (
        <DownloadModal
          filename={downloadFilename}
          onChangeFilename={setDownloadFilename}
          onClose={() => setShowDownloadModal(false)}
          onDownload={() => handleExecuteDownload(downloadFilename)}
        />
      )}
    </div>
  );
}

// Interactive Share Modal Component
function ShareDocumentModal({
  documentId,
  documentTitle,
  shareUrl,
  onClose,
}: {
  documentId: string;
  documentTitle: string;
  shareUrl: string;
  onClose: () => void;
}) {
  const [shareTab, setShareTab] = useState<"email" | "whatsapp" | "link">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter a recipient email address.");
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/documents/${documentId}/share`, {
        shareType: "EMAIL",
        recipientEmail: email.trim(),
        recipientName: name.trim(),
        message: message.trim(),
        shareUrl,
      });
      if (res.data.success) {
        toast.success("Email sent successfully via Brevo! 📧");
        onClose();
      } else {
        toast.error(res.data.message || "Failed to send email.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send email via Brevo.");
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(`📄 Check out this document "${documentTitle}": ${shareUrl}`);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
    toast.success("Opened WhatsApp for sharing! 📱");
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Share link copied to clipboard! 📋");
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-md p-6 animate-scale-in">
        <h3 className="text-lg font-bold text-surface-950 mb-1">Share Document</h3>
        <p className="text-xs text-surface-500 mb-4">Choose how you would like to share "{documentTitle}".</p>

        {/* Tabs */}
        <div className="flex bg-surface-100 p-1 rounded-xl gap-1 mb-5">
          <button
            onClick={() => setShareTab("email")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
              shareTab === "email" ? "bg-white text-brand-600 shadow-xs" : "text-surface-600 hover:text-surface-900"
            )}
          >
            📧 Email (Brevo)
          </button>
          <button
            onClick={() => setShareTab("whatsapp")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
              shareTab === "whatsapp" ? "bg-white text-emerald-600 shadow-xs" : "text-surface-600 hover:text-surface-900"
            )}
          >
            📱 WhatsApp
          </button>
          <button
            onClick={() => setShareTab("link")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
              shareTab === "link" ? "bg-white text-surface-900 shadow-xs" : "text-surface-600 hover:text-surface-900"
            )}
          >
            📋 Copy Link
          </button>
        </div>

        {/* Tab Content */}
        {shareTab === "email" && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium text-surface-700 mb-1 block">Recipient Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-700 mb-1 block">Recipient Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-700 mb-1 block">Personal Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Please review and sign this document..."
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {sending ? "Sending via Brevo..." : "⚡ Send Email Automatically (Brevo API)"}
            </button>
          </div>
        )}

        {shareTab === "whatsapp" && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium text-surface-700 mb-1 block">WhatsApp Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <p className="text-[11px] text-surface-400 mt-1">Leave empty to choose any contact inside WhatsApp.</p>
            </div>
            <button
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              📲 Open & Send via WhatsApp
            </button>
          </div>
        )}

        {shareTab === "link" && (
          <div className="space-y-3 mb-5">
            <label className="text-xs font-medium text-surface-700 mb-1 block">Direct Shareable Link</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded-lg border border-surface-300 text-xs bg-surface-50 font-mono text-surface-700"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-xs font-semibold"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-surface-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-surface-300 text-xs font-semibold text-surface-700 hover:bg-surface-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Download & Rename Modal Component
function DownloadModal({
  filename,
  onChangeFilename,
  onClose,
  onDownload,
}: {
  filename: string;
  onChangeFilename: (v: string) => void;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-surface-950 flex items-center gap-2">
            <Download size={18} className="text-brand-600" /> Download Document
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-surface-500 mb-4">Specify a custom filename for your PDF download:</p>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-surface-700 mb-1">File Name</label>
          <input
            type="text"
            value={filename}
            onChange={(e) => onChangeFilename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onDownload();
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            placeholder="Document-Name.pdf"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-surface-300 text-xs font-semibold text-surface-600 hover:bg-surface-50"
          >
            Cancel
          </button>
          <button
            onClick={onDownload}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
