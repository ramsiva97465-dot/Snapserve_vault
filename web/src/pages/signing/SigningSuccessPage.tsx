import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, Download, ArrowLeft, Edit3, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Logo from "@/components/layout/Logo";

export default function SigningSuccessPage() {
  const { token } = useParams<{ token: string }>();
  const [docTitle, setDocTitle] = useState("Document");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get(`/signing/token/${token}`)
      .then((res) => {
        const title = res.data.document?.title || "Document";
        setDocTitle(title);
        setCustomFileName(`${title}_signed`);
        setPdfUrl(res.data.document?.originalFileUrl || null);
      })
      .catch(() => {});
  }, [token]);

  const handleDownload = (filenameToUse?: string) => {
    const finalName = filenameToUse || customFileName || `${docTitle}_signed`;
    const cleanName = finalName.endsWith(".pdf") ? finalName : `${finalName}.pdf`;

    setDownloading(true);
    const toastId = toast.loading(`Generating signed PDF "${cleanName}"...`);

    api
      .get(`/signing/token/${token}/download`, { responseType: "blob" })
      .then((res) => {
        const blob = new Blob([res.data], { type: "application/pdf" });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        toast.dismiss(toastId);
        toast.success(`Downloaded: ${cleanName}`);
      })
      .catch(() => {
        toast.dismiss(toastId);
        toast.error("Failed to download signed PDF.");
      })
      .finally(() => setDownloading(false));
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <Logo variant="sidebar" />
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-surface-200 shadow-xl p-8 text-center animate-fade-in">
          {/* Success Badge */}
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Check size={36} className="text-emerald-500" strokeWidth={3} />
          </div>

          <h1 className="text-2xl font-bold text-surface-900 mb-1">Document Signed Successfully!</h1>
          <p className="text-sm text-surface-500 mb-6">
            Thank you! Your signature has been securely captured on <span className="font-semibold text-surface-800">{docTitle}</span>.
          </p>

          {/* Download Box */}
          <div className="bg-surface-50 rounded-2xl p-5 border border-surface-200 text-left mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Download Signed Copy</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Ready for Download
              </span>
            </div>

            {/* Quick Download Button */}
            <button
              onClick={() => handleDownload(`${docTitle}_signed.pdf`)}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <Download size={18} /> Download Signed Document ({docTitle}_signed.pdf)
            </button>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 text-left flex items-start gap-2.5">
              <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-surface-900">100% Encrypted</p>
                <p className="text-[11px] text-surface-500">256-bit SHA audit log</p>
              </div>
            </div>
            <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 text-left flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-surface-900">Legally Binding</p>
                <p className="text-[11px] text-surface-500">ESIGN Act Compliant</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
