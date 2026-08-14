import { useParams, Link } from "react-router-dom";
import { Check, Download, FileText } from "lucide-react";
import Logo from "@/components/layout/Logo";

export default function SigningSuccessPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="bg-white border-b border-surface-200 px-4 py-3">
        <Logo variant="sidebar" />
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-fade-in">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <Check size={36} className="text-emerald-500" strokeWidth={3} />
          </div>

          <h1 className="text-2xl font-bold text-surface-950 mb-2">Document Signed Successfully</h1>
          <p className="text-surface-500 mb-8">
            Thank you! Your signature has been captured and the document has been updated.
            You will receive a copy once all parties have signed.
          </p>

          {/* Cards */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-surface-200 text-left">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Check size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900">Signature Captured</p>
                <p className="text-xs text-surface-400 mt-0.5">Your signature has been securely recorded</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-surface-200 text-left">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900">Audit Trail Created</p>
                <p className="text-xs text-surface-400 mt-0.5">All actions are logged with timestamps and IP</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-surface-500 uppercase tracking-wider">
              Powered by Snapserve.ai
            </p>
            <p className="text-xs text-surface-400">
              Electronic signatures powered by Snapserve.ai are legally binding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
