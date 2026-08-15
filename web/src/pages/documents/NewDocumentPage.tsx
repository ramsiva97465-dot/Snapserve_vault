import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, X, Check, ChevronRight, ArrowLeft, Plus, User, Users, UserPlus, Pen } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatFileSize, getInitials, getSignerColor, cn } from "@/lib/utils";
import { Signer, SIGNER_COLORS } from "@/types";

type Step = 1 | 2 | 3;
type SigningMode = "SELF" | "BOTH" | null;

interface NewSigner {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export default function NewDocumentPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Restore state from sessionStorage on page refresh
  const [step, setStep] = useState<Step>(() => {
    const saved = sessionStorage.getItem("snapserve_new_doc_step");
    return saved ? (parseInt(saved, 10) as Step) : 1;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(() => {
    return sessionStorage.getItem("snapserve_new_doc_id") || null;
  });
  const [documentTitle, setDocumentTitle] = useState(() => {
    return sessionStorage.getItem("snapserve_new_doc_title") || "Untitled Document";
  });

  // Step 1.5 — Signing mode
  const [signingMode, setSigningMode] = useState<SigningMode>(() => {
    return (sessionStorage.getItem("snapserve_new_doc_mode") as SigningMode) || null;
  });

  // Step 1 — Upload
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Signers
  const [signers, setSigners] = useState<(Signer & { color: string })[]>(() => {
    const saved = sessionStorage.getItem("snapserve_new_doc_signers");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });
  const [newSigner, setNewSigner] = useState<NewSigner>({ name: "", email: "" });
  const [addingMode, setAddingMode] = useState<null | "external">(null);

  // Auto-sync state to sessionStorage
  useEffect(() => {
    if (documentId) sessionStorage.setItem("snapserve_new_doc_id", documentId);
    sessionStorage.setItem("snapserve_new_doc_step", String(step));
    sessionStorage.setItem("snapserve_new_doc_title", documentTitle);
    if (signingMode) sessionStorage.setItem("snapserve_new_doc_mode", signingMode);
    sessionStorage.setItem("snapserve_new_doc_signers", JSON.stringify(signers));
  }, [documentId, step, documentTitle, signingMode, signers]);

  const clearDocSession = () => {
    sessionStorage.removeItem("snapserve_new_doc_id");
    sessionStorage.removeItem("snapserve_new_doc_step");
    sessionStorage.removeItem("snapserve_new_doc_title");
    sessionStorage.removeItem("snapserve_new_doc_mode");
    sessionStorage.removeItem("snapserve_new_doc_signers");
  };

  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Signers" },
    { num: 3, label: "Prepare" },
  ];

  // Step 1 — Upload handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (dropped.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB.");
      return;
    }
    setFile(dropped);
    const titleWithoutExt = dropped.name.replace(/\.[^/.]+$/, "");
    setDocumentTitle(titleWithoutExt);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error("File size must be under 50MB."); return; }
    setFile(f);
    const titleWithoutExt = f.name.replace(/\.[^/.]+$/, "");
    setDocumentTitle(titleWithoutExt);
  };

  const handleStep1Next = async () => {
    if (!file) { toast.error("Please upload a PDF document."); return; }
    setIsLoading(true);
    try {
      // Create document
      const docRes = await api.post("/documents", { title: documentTitle });
      const docId = docRes.data.id;
      setDocumentId(docId);

      // Upload PDF
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/documents/${docId}/upload`, formData, {
        onUploadProgress: (e) => {
          const pct = Math.round(((e.loaded ?? 0) / (e.total ?? 1)) * 100);
          setUploadProgress(pct);
        },
      });

      toast.success("Document uploaded successfully!");
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Upload failed.");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Step 2 — Signer handlers (Instant 0ms Optimistic UI)
  const handleAddSigner = () => {
    if (!newSigner.name || !newSigner.email) {
      toast.error("Name and email are required.");
      return;
    }
    if (!newSigner.email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }

    const color = SIGNER_COLORS[signers.length % SIGNER_COLORS.length];
    const createdSigner = {
      id: `signer-${Date.now()}`,
      documentId: documentId || "",
      name: newSigner.name,
      email: newSigner.email,
      phone: newSigner.phone,
      role: newSigner.role || "Signer",
      orderIndex: signers.length,
      status: "PENDING" as const,
      color,
      createdAt: new Date().toISOString(),
    };

    // ⚡ 0ms INSTANT UI response
    setSigners((prev) => [...prev, createdSigner]);
    const addedName = newSigner.name;
    setNewSigner({ name: "", email: "" });
    setAddingMode(null);
    toast.success(`${addedName} added as signer.`);

    // Background DB sync
    api.post("/signers", {
      documentId,
      name: createdSigner.name,
      email: createdSigner.email,
      phone: createdSigner.phone,
      role: createdSigner.role,
      color,
    }).catch((err) => {
      console.warn("Background signer sync note:", err);
    });
  };

  const handleAddMyself = () => {
    const ownerName = user?.name || "SIVARAM R S";
    const ownerEmail = user?.email || "ramsiva97465@gmail.com";
    const color = SIGNER_COLORS[0];

    const createdSigner = {
      id: `signer-owner-${Date.now()}`,
      documentId: documentId || "",
      name: ownerName,
      email: ownerEmail,
      role: "Owner",
      orderIndex: 0,
      status: "PENDING" as const,
      color,
      createdAt: new Date().toISOString(),
    };

    // ⚡ 0ms INSTANT UI response
    setSigners((prev) => [...prev, createdSigner]);
    setNewSigner({ name: "", email: "" });
    setAddingMode(null);
    toast.success(`${ownerName} (You) added as Signer 1.`);

    // Background DB sync
    api.post("/signers", {
      documentId,
      name: ownerName,
      email: ownerEmail,
      role: "Owner",
      color,
    }).catch((err) => {
      console.warn("Background owner signer sync note:", err);
    });
  };

  const handleRemoveSigner = async (signerId: string) => {
    try {
      await api.delete(`/signers/${signerId}`);
      setSigners((prev) => prev.filter((s) => s.id !== signerId));
    } catch {
      toast.error("Failed to remove signer.");
    }
  };

  const handleStep2Next = () => {
    if (!signingMode) {
      toast.error("Please choose who needs to sign.");
      return;
    }
    if (signingMode === "SELF") {
      // Skip adding signers, go straight to step 3
      setStep(3);
      return;
    }
    if (signers.length === 0) {
      toast.error("Please add at least one signer.");
      return;
    }
    setStep(3);
  };

  const handleGoToPrepare = () => {
    if (!documentId) return;
    clearDocSession();
    navigate(`/documents/${documentId}/prepare?mode=${signingMode || "BOTH"}`);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-surface-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate("/documents")}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Documents
        </button>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute left-0 right-0 top-4 h-px bg-surface-200 -z-0 mx-8" />
          {steps.map((s, i) => (
            <div key={s.num} className="flex flex-col items-center gap-2 z-10">
              <div
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all",
                  step > s.num
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : step === s.num
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-white border-surface-300 text-surface-400"
                )}
              >
                {step > s.num ? <Check size={14} /> : s.num}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  step === s.num ? "text-brand-600" : step > s.num ? "text-emerald-600" : "text-surface-400"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1 — Upload */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-surface-950 mb-1">Upload Document</h2>
            <p className="text-surface-500 text-sm mb-6">Upload the PDF you want to send for signature.</p>

            {/* Document title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Document title</label>
              <input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Employment Agreement"
              />
            </div>

            {/* Drop zone */}
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all",
                  isDragging
                    ? "border-brand-400 bg-brand-50"
                    : "border-surface-300 hover:border-brand-300 hover:bg-brand-50/30"
                )}
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                  <Upload size={28} className="text-brand-600" />
                </div>
                <p className="text-sm font-semibold text-surface-800 mb-1">
                  {isDragging ? "Drop your file here" : "Drag & drop or click to upload"}
                </p>
                <p className="text-xs text-surface-400">PDF, PPT, PPTX, Word, Images · Max 50MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="border border-surface-200 rounded-xl p-4 flex items-center gap-4 bg-surface-50">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={24} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900 truncate">{file.name}</p>
                  <p className="text-xs text-surface-400">{formatFileSize(file.size)}</p>
                  {uploadProgress > 0 && (
                    <div className="mt-2 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 hover:text-surface-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={handleStep1Next}
                disabled={!file || isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <> Continue <ChevronRight size={16} /> </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Who Signs? */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-surface-950 mb-1">Who needs to sign?</h2>
            <p className="text-surface-500 text-sm mb-6">Choose the signing mode for this document.</p>

            {/* Mode selector cards */}
            {!signingMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => { setSigningMode("SELF"); }}
                  className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-surface-200 hover:border-brand-400 hover:bg-brand-50/30 transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                    <User size={28} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-surface-900 mb-1">🙋 Only Me</p>
                    <p className="text-sm text-surface-500">I will sign this document myself. No links sent to others.</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSigningMode("BOTH");
                    setAddingMode("external");
                    setNewSigner({
                      name: user?.name || "SIVARAM R S",
                      email: user?.email || "ramsiva97465@gmail.com",
                    });
                  }}
                  className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-surface-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <Users size={28} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-surface-900 mb-1">👥 Me & Others</p>
                    <p className="text-sm text-surface-500">I sign + send a link to other people to sign too.</p>
                  </div>
                </button>
              </div>
            )}

            {/* SELF mode confirmation */}
            {signingMode === "SELF" && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-50 border border-brand-200 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-brand-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-900">Only Me selected</p>
                  <p className="text-xs text-brand-600">You'll sign this document yourself in the prepare editor.</p>
                </div>
                <button onClick={() => setSigningMode(null)} className="text-xs text-brand-500 hover:text-brand-700 underline">Change</button>
              </div>
            )}

            {/* BOTH mode — show signer form */}
            {signingMode === "BOTH" && (
              <div className="mb-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-4">
                  <Users size={16} className="text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium flex-1">Me & Others selected — add the people who need to sign below.</p>
                  <button onClick={() => { setSigningMode(null); setSigners([]); }} className="text-xs text-emerald-600 hover:text-emerald-800 underline">Change</button>
                </div>

                {/* Signer list */}
                {signers.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {signers.map((signer, i) => (
                      <div key={signer.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 bg-surface-50">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: signer.color }}>
                          {getInitials(signer.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-900">{signer.name}</p>
                          <p className="text-xs text-surface-400">{signer.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">Signer {i + 1}</span>
                          <button onClick={() => handleRemoveSigner(signer.id)} className="p-1 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add signer form */}
                {addingMode === "external" && (
                  <div className="border border-brand-200 bg-brand-50/30 rounded-xl p-4 mb-4 animate-slide-up">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-surface-800">
                        {signers.length === 0 ? "Add Signer 1 (You / Owner)" : `Add Signer ${signers.length + 1} (Client / Guest)`}
                      </h3>
                      {signers.length === 0 && (
                        <button
                          type="button"
                          onClick={handleAddMyself}
                          className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center gap-1 shadow-sm transition-all"
                        >
                          ⚡ Add Myself as Signer 1
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-surface-600 mb-1 block">Full Name *</label>
                        <input
                          value={newSigner.name}
                          onChange={(e) => setNewSigner((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          placeholder={signers.length === 0 ? "Your Name (e.g. SIVARAM R S)" : "Client / Guest Name"}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-surface-600 mb-1 block">Email Address *</label>
                        <input
                          value={newSigner.email}
                          onChange={(e) => setNewSigner((p) => ({ ...p, email: e.target.value }))}
                          type="email"
                          className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          placeholder={signers.length === 0 ? "your.email@example.com" : "client@company.com"}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleAddSigner} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
                        <Check size={14} /> Add Signer
                      </button>
                      <button onClick={() => { setAddingMode(null); setNewSigner({ name: "", email: "" }); }} className="px-4 py-2 rounded-lg border border-surface-300 text-sm text-surface-600 hover:bg-surface-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!addingMode && (
                  <button
                    onClick={() => {
                      setAddingMode("external");
                      if (signers.length === 0) {
                        setNewSigner({
                          name: user?.name || "SIVARAM R S",
                          email: user?.email || "ramsiva97465@gmail.com",
                        });
                      } else {
                        setNewSigner({ name: "", email: "" });
                      }
                    }}
                    className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-300 hover:bg-brand-50/20 text-sm text-surface-500 hover:text-brand-600 transition-all font-medium"
                  >
                    <Plus size={16} /> Add Signer {signers.length + 1}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-100">
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800">
                <ArrowLeft size={15} /> Back
              </button>
              <button
                onClick={handleStep2Next}
                disabled={!signingMode || (signingMode === "BOTH" && signers.length === 0)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Prepare */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-surface-950 mb-1">Prepare Document</h2>
            <p className="text-surface-500 text-sm mb-6">
              {"You're ready to place signature fields. Open the document editor to continue."}
            </p>

            {/* Summary */}
            <div className="bg-surface-50 rounded-xl p-5 border border-surface-200 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-brand-600" />
                <span className="text-sm text-surface-700 font-medium">{documentTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users size={16} className="text-brand-600" />
                <span className="text-sm text-surface-700">
                  {signers.length} signer{signers.length !== 1 ? "s" : ""} — {signers.map((s) => s.name).join(", ")}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex -space-x-1 mt-0.5">
                  {signers.map((s, i) => (
                    <div
                      key={s.id}
                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ backgroundColor: s.color }}
                      title={s.name}
                    >
                      {getInitials(s.name)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-700 font-medium mb-1">✓ Ready to prepare</p>
              <p className="text-xs text-emerald-600">Click "Open Editor" to place signature fields, assign them to signers, and send the document.</p>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                onClick={handleGoToPrepare}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm"
              >
                Open Editor <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
