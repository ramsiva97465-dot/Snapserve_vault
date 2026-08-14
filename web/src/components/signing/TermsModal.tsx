import { useState } from "react";
import { X, Check } from "lucide-react";

interface TermsModalProps {
  signerName: string;
  documentTitle: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsModal({ signerName, documentTitle, onAccept, onDecline }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!agreed) return;
    setAccepting(true);
    await onAccept();
    setAccepting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-surface-950">Electronic Signature Terms</h2>
            <p className="text-sm text-surface-500 mt-0.5">Please read and accept before signing</p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="bg-surface-50 rounded-xl border border-surface-200 p-4 mb-4">
            <p className="text-sm text-surface-700">
              You are about to sign: <strong>{documentTitle}</strong>
            </p>
            <p className="text-sm text-surface-500 mt-1">As: {signerName}</p>
          </div>

          <div className="prose prose-sm text-surface-700 space-y-3 text-sm leading-relaxed">
            <section>
              <h3 className="font-semibold text-surface-900 text-sm">1. Acceptance of Electronic Signature</h3>
              <p>By clicking &quot;Accept &amp; Continue&quot;, you agree that your electronic signature is legally binding and carries the same weight as a handwritten signature under applicable electronic signature laws.</p>
            </section>

            <section>
              <h3 className="font-semibold text-surface-900 text-sm">2. Signature Collection</h3>
              <p>Your signature, initials, and other information will be collected and embedded in the document. This creates a permanent, immutable record of your agreement.</p>
            </section>

            <section>
              <h3 className="font-semibold text-surface-900 text-sm">3. Data Storage &amp; Security</h3>
              <p>Your signature data is encrypted and stored securely. Snapserve.ai uses bank-grade security protocols to protect your information.</p>
            </section>

            <section>
              <h3 className="font-semibold text-surface-900 text-sm">4. Document Integrity</h3>
              <p>Once completed, the document will be sealed and cannot be modified. An audit trail is created for every action taken on this document.</p>
            </section>

            <section>
              <h3 className="font-semibold text-surface-900 text-sm">5. Consent to Electronic Communications</h3>
              <p>You consent to receive documents and communications electronically as part of this signing process.</p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-100 flex-shrink-0">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-surface-700">
              I have read and agree to the Terms and Conditions. I understand my electronic signature is legally binding.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl border border-surface-300 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreed || accepting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <> <Check size={16} /> Accept &amp; Continue </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
