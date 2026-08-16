import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjs from "pdfjs-dist";
import { toast } from "sonner";
import { Check, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { DocumentField, Signer, FIELD_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import TermsModal from "@/components/signing/TermsModal";
import SignatureModal from "@/components/signing/SignatureModal";
import Logo from "@/components/layout/Logo";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type FieldValue = { value?: string; imageData?: string; signatureType?: string };

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeField, setActiveField] = useState<DocumentField | null>(null);

  // Document context
  const [docTitle, setDocTitle] = useState("");
  const [signer, setSigner] = useState<Signer | null>(null);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageSize, setPageSize] = useState({ width: 794, height: 1123 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [completing, setCompleting] = useState(false);

  // Validate token
  useEffect(() => {
    const validate = async () => {
      try {
        const res = await api.get(`/signing/token/${token}`);
        setDocTitle(res.data.document.title);
        setSigner(res.data.signer);
        setFields(res.data.fields);
        setPdfUrl(res.data.document.originalFileUrl);
        setPageCount(res.data.document.pageCount || 1);

        // Pre-populate any existing values (e.g. Owner's signature)
        const initialVals: Record<string, FieldValue> = {};
        (res.data.fields || []).forEach((f: any) => {
          if (f.value || f.imageData) {
            initialVals[f.id] = { value: f.value, imageData: f.imageData };
          }
        });
        setFieldValues(initialVals);

        const rawUrl: string | null | undefined = res.data.document.originalFileUrl;
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
          console.error("PDF load error:", pdfErr);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Invalid or expired signing link.");
        setShowTermsModal(false);
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token]);

  // Mobile viewport scaling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScale(Math.max(0.45, (window.innerWidth - 32) / 794));
      } else if (window.innerWidth < 1024) {
        setScale(0.85);
      } else {
        setScale(1.0);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Render PDF page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setPageSize({ width: viewport.width, height: viewport.height });
      await page.render({ canvasContext: ctx, viewport }).promise;
    };
    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const handleTermsAccept = async () => {
    try {
      await api.post(`/signing/token/${token}/accept-terms`);
      setTermsAccepted(true);
      setShowTermsModal(false);
    } catch {
      toast.error("Failed to accept terms. Please try again.");
    }
  };

  const handleFieldClick = (field: DocumentField) => {
    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }
    setActiveField(field);
    if (field.fieldType === "SIGNATURE" || field.fieldType === "INITIALS" || field.fieldType === "SEAL") {
      setShowSignatureModal(true);
    } else if (field.fieldType === "DATE") {
      const today = new Date().toLocaleDateString("en-US");
      setFieldValues((prev) => ({ ...prev, [field.id]: { value: today, signatureType: "TYPED" } }));
      saveFieldValue(field.id, { value: today, signatureType: "TYPED" });
    } else if (field.fieldType === "CHECKBOX") {
      const current = fieldValues[field.id]?.value;
      const newVal = current === "checked" ? "" : "checked";
      setFieldValues((prev) => ({ ...prev, [field.id]: { value: newVal, signatureType: "TYPED" } }));
      saveFieldValue(field.id, { value: newVal, signatureType: "TYPED" });
    }
  };

  const saveFieldValue = async (fieldId: string, data: FieldValue) => {
    try {
      const formData = new FormData();
      formData.append("fieldId", fieldId);
      formData.append("signatureType", data.signatureType || "TYPED");
      if (data.value) formData.append("value", data.value);
      if (data.imageData) formData.append("imageData", data.imageData);
      await api.post(`/signing/token/${token}/sign`, formData);
    } catch {
      toast.error("Failed to save field.");
    }
  };

  const handleSignatureCapture = async (signatureData: { type: string; value?: string; imageData?: string }) => {
    if (!activeField) return;
    const fv: FieldValue = {
      value: signatureData.value,
      imageData: signatureData.imageData,
      signatureType: signatureData.type,
    };
    setFieldValues((prev) => ({ ...prev, [activeField.id]: fv }));
    await saveFieldValue(activeField.id, fv);
    setShowSignatureModal(false);
    setActiveField(null);
    toast.success("Signature captured!");
  };

  const handleComplete = async () => {
    const requiredFields = fields.filter((f) => f.isRequired);
    const missingFields = requiredFields.filter((f) => !fieldValues[f.id]?.value && !fieldValues[f.id]?.imageData);

    if (missingFields.length > 0) {
      toast.error(`Please complete ${missingFields.length} required field${missingFields.length !== 1 ? "s" : ""}.`);
      return;
    }

    setCompleting(true);
    try {
      await api.post(`/signing/token/${token}/complete`);
      navigate(`/sign/${token}/success`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to complete signing.");
    } finally {
      setCompleting(false);
    }
  };

  const completedCount = fields.filter((f) => fieldValues[f.id]?.value || fieldValues[f.id]?.imageData).length;
  const pageFields = fields.filter((f) => f.pageNumber === currentPage);
  const progress = fields.length > 0 ? (completedCount / fields.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-brand-600 animate-spin" />
          <p className="text-sm text-surface-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-surface-200 shadow-card p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-surface-950 mb-2">Signing Link Invalid</h2>
          <p className="text-surface-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      {/* Terms Modal */}
      {showTermsModal && !termsAccepted && (
        <TermsModal
          signerName={signer?.name || ""}
          documentTitle={docTitle}
          onAccept={handleTermsAccept}
          onDecline={() => setError("You must accept the terms to sign this document.")}
        />
      )}

      {/* Signature Modal */}
      {showSignatureModal && activeField && (
        <SignatureModal
          fieldType={activeField.fieldType}
          signerName={signer?.name || ""}
          onCapture={handleSignatureCapture}
          onClose={() => { setShowSignatureModal(false); setActiveField(null); }}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <Logo variant="sidebar" />
        <div className="text-center hidden sm:block">
          <p className="text-sm font-semibold text-surface-900">{docTitle}</p>
          {signer && (
            <p className="text-xs text-surface-400">
              Signing as <span className="font-medium text-surface-600">{signer.name}</span>
              <span className="ml-2 text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-semibold border border-brand-200">
                🔒 Assigned Fields Only
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-700">{completedCount}/{fields.length}</span>
          <div className="w-24 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Instruction Banner */}
      {termsAccepted && (
        <div className="bg-brand-600 text-white text-center py-2 px-4 text-sm font-medium">
          Click the highlighted fields to complete this document.
          {fields.length > 0 && <span className="ml-2 opacity-80">{fields.length - completedCount} remaining</span>}
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex justify-center p-4 sm:p-6">
        <div className="relative">
          {/* PDF Canvas */}
          <div className="relative shadow-xl rounded-sm">
            {!pdfDoc ? (
              <div style={{ width: 794, height: 1123 }} className="bg-white flex items-center justify-center">
                <p className="text-surface-400">PDF not available</p>
              </div>
            ) : (
              <canvas ref={canvasRef} className="pdf-page-canvas block" />
            )}

            {/* Overlay fields for this page */}
            {pageFields.map((field) => {
              const fVal = fieldValues[field.id] || { value: field.value, imageData: field.imageData };
              const hasValue = !!(fVal.imageData || fVal.value);
              const props = field.properties || {};

              return (
                <div
                  key={field.id}
                  onClick={() => handleFieldClick(field)}
                  className={cn(
                    "absolute cursor-pointer rounded transition-all flex items-center justify-center overflow-hidden",
                    hasValue
                      ? "border-1.5 border-emerald-500/60 bg-transparent hover:border-emerald-600"
                      : field.isRequired
                      ? "border-2 border-brand-500 bg-brand-50/40 animate-pulse-soft"
                      : "border-2 border-brand-300 bg-brand-50/20"
                  )}
                  style={{
                    left: field.x * scale,
                    top: field.y * scale,
                    width: field.width * scale,
                    height: field.height * scale,
                    zIndex: 10,
                  }}
                >
                  {hasValue ? (
                    <div className="flex items-center justify-center h-full w-full relative bg-transparent">
                      {fVal.imageData ? (
                        <img
                          src={fVal.imageData}
                          alt="Signature"
                          className="max-w-full max-h-full object-contain p-0.5 bg-transparent"
                        />
                      ) : (
                        <span
                          className="truncate px-1 bg-transparent text-center"
                          style={{
                            color: props.color || "#0f172a",
                            fontFamily: props.fontFamily || "inherit",
                            fontSize: props.fontSize ? `${props.fontSize * scale}px` : "12px",
                            fontWeight: props.fontWeight || "bold",
                            fontStyle: props.fontStyle || "normal",
                          }}
                        >
                          {fVal.value === "checked" ? "✓ Checked" : fVal.value}
                        </span>
                      )}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 border border-white rounded-full flex items-center justify-center shadow-xs">
                        <Check size={8} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <span className="text-xs font-semibold text-brand-600 px-1.5 truncate">
                        {FIELD_LABELS[field.fieldType] || field.fieldType}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t border-surface-200 px-4 py-3 flex items-center justify-between sticky bottom-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-surface-600 font-medium">Page {currentPage} of {pageCount}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount}
            className="p-2 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={handleComplete}
          disabled={completing || completedCount < fields.filter((f) => f.isRequired).length}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {completing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          Complete Signing
        </button>
      </div>
    </div>
  );
}
