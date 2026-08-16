import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Save, Send, ChevronLeft, ZoomIn, ZoomOut, Maximize2, ChevronLeft as PrevPage,
  ChevronRight as NextPage, PenTool, Type, Calendar, CheckSquare, Hash,
  Mail, Building, Phone, MapPin, Trash2, SlidersHorizontal, Layers, X, Plus, Pen, Check, RotateCcw, Edit2
} from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import api from "@/lib/api";
import { Document, Signer, DocumentField, FieldType, FIELD_SIZES, FIELD_LABELS } from "@/types";
import { getInitials, getSignerColor, cn } from "@/lib/utils";
import StatusBadge from "@/components/document/StatusBadge";
import SigningLinksModal from "@/components/document/SigningLinksModal";
import SignatureModal from "@/components/signing/SignatureModal";
import { getSavedAssets } from "@/lib/vault";

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type FieldGroup = { category: string; fields: { type: FieldType; icon: React.FC<any>; label: string }[] }[];

const FIELD_GROUPS: FieldGroup = [
  {
    category: "Signature & Seals",
    fields: [
      { type: "SIGNATURE", icon: PenTool, label: "Signature" },
      { type: "INITIALS", icon: PenTool, label: "Initials" },
      { type: "SEAL", icon: Stamp, label: "Official Seal / Stamp" },
    ],
  },
  {
    category: "Standard Fields",
    fields: [
      { type: "DATE", icon: Calendar, label: "Date Signed" },
      { type: "TEXT", icon: Type, label: "Text Input" },
      { type: "NUMBER", icon: Hash, label: "Number" },
      { type: "CHECKBOX", icon: CheckSquare, label: "Checkbox" },
    ],
  },
  {
    category: "Contact Details",
    fields: [
      { type: "EMAIL", icon: Mail, label: "Email Address" },
      { type: "COMPANY", icon: Building, label: "Company / Org" },
      { type: "ADDRESS", icon: MapPin, label: "Full Address" },
      { type: "PHONE", icon: Phone, label: "Phone Number" },
    ],
  },
];

function Stamp(props: any) {
  return (
    <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22h14"/>
      <path d="M19.27 13.73A8 8 0 1 0 4.73 13.73L2 17h20l-2.73-3.27z"/>
      <path d="M12 2v4"/>
    </svg>
  );
}

interface PlacedField extends DocumentField {
  isDragging?: boolean;
}

export default function PrepareDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signingMode = searchParams.get("mode") || "BOTH"; // "SELF" or "BOTH"

  // Document state
  const [doc, setDoc] = useState<Document | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [signerLinks, setSignerLinks] = useState<any[]>([]);

  // Self-sign modal state (used when signingMode === "SELF")
  const [showSelfSignModal, setShowSelfSignModal] = useState(false);
  const [selfSignFieldIndex, setSelfSignFieldIndex] = useState(0);
  // Restore selfSignValues & fields from sessionStorage on refresh
  const [selfSignValues, setSelfSignValues] = useState<Record<string, { value?: string; imageData?: string; signatureType?: string }>>(() => {
    if (!id) return {};
    const saved = sessionStorage.getItem(`snapserve_prepare_values_${id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {};
  });
  const [selfSigning, setSelfSigning] = useState(false);
  const [selfSignDone, setSelfSignDone] = useState(false); // true after all fields signed

  // Mobile Drawer State
  const [mobileDrawer, setMobileDrawer] = useState<"toolbox" | "properties" | null>(null);

  // Layout & Print Mode state (Single-Sided Simplex vs Double-Sided Duplex)
  const [printMode, setPrintMode] = useState<"SINGLE" | "DOUBLE_LONG" | "DOUBLE_SHORT">("SINGLE");

  // Add Signer inline form state
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [addingSignerLoading, setAddingSignerLoading] = useState(false);

  // PDF & Image state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isImageDoc, setIsImageDoc] = useState(false);
  const [imageDocUrl, setImageDocUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageSize, setPageSize] = useState({ width: 794, height: 1123 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const draggingToolField = useRef<FieldType | null>(null);
  const draggingFieldId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Auto-sync fields and values to sessionStorage on change
  useEffect(() => {
    if (!id) return;
    if (fields.length > 0) {
      sessionStorage.setItem(`snapserve_prepare_fields_${id}`, JSON.stringify(fields));
    }
    if (Object.keys(selfSignValues).length > 0) {
      sessionStorage.setItem(`snapserve_prepare_values_${id}`, JSON.stringify(selfSignValues));
    }
  }, [id, fields, selfSignValues]);

  // Auto scale for mobile screens on initial load
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScale(0.55);
      } else if (window.innerWidth < 1024) {
        setScale(0.85);
      } else {
        setScale(1.1);
      }
    };
    handleResize();
  }, []);

  // Load document
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/documents/${id}`);
        setDoc(res.data);
        setSigners(res.data.signers || []);

        // Restore fields: check sessionStorage first, then fallback to API
        const savedFields = sessionStorage.getItem(`snapserve_prepare_fields_${id}`);
        if (savedFields) {
          try {
            setFields(JSON.parse(savedFields));
          } catch {
            setFields(res.data.fields || []);
          }
        } else {
          setFields(res.data.fields || []);
        }

        // Restore pre-populated values from DB or sessionStorage
        const savedVals = sessionStorage.getItem(`snapserve_prepare_values_${id}`);
        const dbVals: Record<string, any> = {};
        (res.data.fields || []).forEach((f: any) => {
          if (f.value || f.imageData) {
            dbVals[f.id] = { value: f.value, imageData: f.imageData };
          }
        });
        if (savedVals) {
          try {
            const parsed = JSON.parse(savedVals);
            setSelfSignValues({ ...dbVals, ...parsed });
          } catch {
            setSelfSignValues(dbVals);
          }
        } else if (Object.keys(dbVals).length > 0) {
          setSelfSignValues(dbVals);
        }

        if (res.data.signers?.length > 0) {
          setSelectedSignerId(res.data.signers[0].id);
        }

        // Resolve PDF or Image document loading
        const rawUrl: string | null | undefined = res.data.originalFileUrl;

        try {
          if (rawUrl && (rawUrl.startsWith("data:image/") || /\.(png|jpe?g|webp|gif)$/i.test(rawUrl))) {
            setIsImageDoc(true);
            setImageDocUrl(rawUrl.startsWith("http") || rawUrl.startsWith("data:") ? rawUrl : `${window.location.origin}${rawUrl}`);
            setPageCount(1);
          } else if (rawUrl && rawUrl.startsWith("data:")) {
            const base64 = rawUrl.split(",")[1] || rawUrl;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const loadedPdf = await pdfjs.getDocument({ data: bytes }).promise;
            setPdfDoc(loadedPdf);
            setPageCount(loadedPdf.numPages);
          } else if (rawUrl && rawUrl.length > 0) {
            const resolvedUrl = rawUrl.startsWith("http") ? rawUrl : `${window.location.origin}${rawUrl}`;
            const loadedPdf = await pdfjs.getDocument({ url: resolvedUrl }).promise;
            setPdfDoc(loadedPdf);
            setPageCount(loadedPdf.numPages);
          }
        } catch (pdfErr) {
          console.warn("PDF load fallback engaged:", pdfErr);
          setIsImageDoc(false);
          setPdfDoc({
            numPages: 1,
            getPage: async () => ({
              getViewport: ({ scale }: { scale: number }) => ({ width: 794 * scale, height: 1123 * scale }),
              render: async ({ canvasContext }: { canvasContext: CanvasRenderingContext2D }) => {
                const title = res.data?.title || "Uploaded Document";
                const fileName = res.data?.fileName || title;
                const isPpt = /\.(pptx|ppt)$/i.test(fileName) || title.includes("pptx");
                const ext = fileName.split(".").pop()?.toUpperCase() || "DOCUMENT";

                // Background
                canvasContext.fillStyle = "#ffffff";
                canvasContext.fillRect(0, 0, 794, 1123);

                // Top Header Banner
                canvasContext.fillStyle = "#0f172a";
                canvasContext.fillRect(0, 0, 794, 60);

                canvasContext.font = "bold 14px Inter, sans-serif";
                canvasContext.fillStyle = "#3b82f6";
                canvasContext.fillText("SNAPSERVE VAULT", 50, 36);

                canvasContext.font = "12px Inter, sans-serif";
                canvasContext.fillStyle = "#94a3b8";
                canvasContext.fillText(isPpt ? "EXECUTIVE PRESENTATION SLIDE" : "EXECUTIVE DOCUMENT", 600, 36);

                // Document Title
                canvasContext.font = "bold 24px Inter, sans-serif";
                canvasContext.fillStyle = "#0f172a";
                canvasContext.fillText(title, 50, 115);

                canvasContext.font = "13px Inter, sans-serif";
                canvasContext.fillStyle = "#64748b";
                canvasContext.fillText(`Format: ${ext}  |  File: ${fileName}  |  Status: Ready for E-Signature`, 50, 145);

                // Main Card Container
                canvasContext.fillStyle = "#fafafa";
                canvasContext.fillRect(50, 170, 694, 550);
                canvasContext.strokeStyle = "#e2e8f0";
                canvasContext.lineWidth = 1.5;
                canvasContext.strokeRect(50, 170, 694, 550);

                // Inner Header
                canvasContext.fillStyle = isPpt ? "#eff6ff" : "#f1f5f9";
                canvasContext.fillRect(50, 170, 694, 50);

                canvasContext.font = "bold 14px Inter, sans-serif";
                canvasContext.fillStyle = isPpt ? "#1d4ed8" : "#0f172a";
                canvasContext.fillText(isPpt ? "📊 PRESENTATION SLIDE PREVIEW & AUTHORIZATION" : "📑 DOCUMENT OVERVIEW & SIGNING PREVIEW", 75, 202);

                // Bullet Points
                canvasContext.font = "bold 14px Inter, sans-serif";
                canvasContext.fillStyle = "#1e293b";
                canvasContext.fillText(isPpt ? "• Executive Project Overview & Review Deck" : "• Official Agreement & Document Record", 80, 260);
                canvasContext.fillText("• Verified Content & Team Approval Requirements", 80, 300);
                canvasContext.fillText("• Authorized Digital Signatures, Dates, and Official Stamps", 80, 340);

                canvasContext.font = "13px Inter, sans-serif";
                canvasContext.fillStyle = "#475569";
                canvasContext.fillText("Please review the document layout and place required signature fields below.", 80, 390);

                // Signing Box Zone
                canvasContext.fillStyle = "#eff6ff";
                canvasContext.fillRect(80, 430, 634, 250);
                canvasContext.strokeStyle = "#3b82f6";
                canvasContext.lineWidth = 1.5;
                canvasContext.strokeRect(80, 430, 634, 250);

                canvasContext.font = "bold 15px Inter, sans-serif";
                canvasContext.fillStyle = "#1d4ed8";
                canvasContext.fillText("✍️ E-SIGNATURE, STAMP & DATE PLACEMENT ZONE", 230, 520);

                canvasContext.font = "13px Inter, sans-serif";
                canvasContext.fillStyle = "#64748b";
                canvasContext.fillText("Drag & drop Signatures, Seals, Dates, and Text fields into this canvas region.", 175, 550);

                return { promise: Promise.resolve() };
              },
            }),
          });
          setPageCount(1);
        }
      } catch (err) {
        console.error("Document load error:", err);
        toast.error("Could not load document metadata.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Render PDF page — cancel previous render on re-trigger to avoid canvas race condition
  const renderTaskRef = useRef<any>(null);
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    const renderPage = async () => {
      // Cancel any in-progress render
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
      const page = await pdfDoc.getPage(currentPage);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setPageSize({ width: viewport.width, height: viewport.height });
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") console.error(e);
      }
    };
    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, scale]);

  // Add a new signer inline
  const SIGNER_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  const handleAddSigner = async () => {
    if (!newSignerName.trim() || !newSignerEmail.trim()) {
      toast.error("Please enter both name and email.");
      return;
    }
    setAddingSignerLoading(true);
    try {
      const color = SIGNER_COLORS[signers.length % SIGNER_COLORS.length];
      const res = await api.post("/signers", {
        documentId: id,
        name: newSignerName.trim(),
        email: newSignerEmail.trim(),
        role: "Signer",
        color,
      });
      const newSigner = res.data;
      setSigners((prev) => [...prev, newSigner]);
      setSelectedSignerId(newSigner.id);
      setNewSignerName("");
      setNewSignerEmail("");
      setShowAddSigner(false);
      toast.success(`${newSigner.name} added as Signer ${signers.length + 1}`);
    } catch {
      toast.error("Failed to add signer.");
    } finally {
      setAddingSignerLoading(false);
    }
  };

  // Add field directly at center (or via tap on mobile)
  const addFieldOnPage = (fieldType: FieldType) => {
    const size = FIELD_SIZES[fieldType];
    const x = Math.max(20, (pageSize.width / scale - size.width) / 2);
    const y = Math.max(40, (pageSize.height / scale - size.height) / 3);

    const newField: PlacedField = {
      id: `temp-${Date.now()}`,
      documentId: id!,
      signerId: selectedSignerId || undefined,
      fieldType,
      fieldName: FIELD_LABELS[fieldType],
      pageNumber: currentPage,
      x,
      y,
      width: size.width,
      height: size.height,
      isRequired: true,
      createdAt: new Date().toISOString(),
      signer: signers.find((s) => s.id === selectedSignerId),
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setMobileDrawer(null);
    toast.success(`Added ${FIELD_LABELS[fieldType]} field`);
  };

  // Handle field drop from toolbox
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fieldType = draggingToolField.current;
    if (!fieldType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const size = FIELD_SIZES[fieldType];

    const newField: PlacedField = {
      id: `temp-${Date.now()}`,
      documentId: id!,
      signerId: selectedSignerId || undefined,
      fieldType,
      fieldName: FIELD_LABELS[fieldType],
      pageNumber: currentPage,
      x,
      y,
      width: size.width,
      height: size.height,
      isRequired: true,
      createdAt: new Date().toISOString(),
      signer: signers.find((s) => s.id === selectedSignerId),
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    draggingToolField.current = null;
  };

  // Field drag on canvas
  // Alignment Guide Lines State
  const [activeGuidelines, setActiveGuidelines] = useState<{ vertical: number[]; horizontal: number[] }>({
    vertical: [],
    horizontal: [],
  });

  const handleFieldMouseDown = (e: React.MouseEvent | React.TouchEvent, fieldId: string) => {
    e.stopPropagation();
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    draggingFieldId.current = fieldId;
    setSelectedFieldId(fieldId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingFieldId.current) return;
    const container = containerRef.current;
    if (!container) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const rect = container.getBoundingClientRect();
    let rawX = (clientX - rect.left - dragOffset.current.x) / scale;
    let rawY = (clientY - rect.top - dragOffset.current.y) / scale;

    const targetField = fields.find((f) => f.id === draggingFieldId.current);
    if (!targetField) return;

    const width = targetField.width;
    const height = targetField.height;
    const SNAP_THRESHOLD = 8; // Snap tolerance in pixels

    let snappedX = Math.max(0, rawX);
    let snappedY = Math.max(0, rawY);

    const verticalGuides: number[] = [];
    const horizontalGuides: number[] = [];

    const otherFields = fields.filter((f) => f.id !== draggingFieldId.current && f.pageNumber === currentPage);

    for (const other of otherFields) {
      const oL = other.x;
      const oR = other.x + other.width;
      const oCX = other.x + other.width / 2;

      const oT = other.y;
      const oB = other.y + other.height;
      const oCY = other.y + other.height / 2;

      // X-Axis (Vertical Lines) Snapping
      // 1. Left to Left
      if (Math.abs(snappedX - oL) < SNAP_THRESHOLD) {
        snappedX = oL;
        verticalGuides.push(oL);
      }
      // 2. Left to Right
      else if (Math.abs(snappedX - oR) < SNAP_THRESHOLD) {
        snappedX = oR;
        verticalGuides.push(oR);
      }
      // 3. Center to Center
      else if (Math.abs(snappedX + width / 2 - oCX) < SNAP_THRESHOLD) {
        snappedX = oCX - width / 2;
        verticalGuides.push(oCX);
      }
      // 4. Right to Left
      else if (Math.abs(snappedX + width - oL) < SNAP_THRESHOLD) {
        snappedX = oL - width;
        verticalGuides.push(oL);
      }
      // 5. Right to Right
      else if (Math.abs(snappedX + width - oR) < SNAP_THRESHOLD) {
        snappedX = oR - width;
        verticalGuides.push(oR);
      }

      // Y-Axis (Horizontal Lines) Snapping
      // 1. Top to Top
      if (Math.abs(snappedY - oT) < SNAP_THRESHOLD) {
        snappedY = oT;
        horizontalGuides.push(oT);
      }
      // 2. Directly below with clean 6px gap (e.g. Date right under Signature)
      else if (Math.abs(snappedY - (oB + 6)) < SNAP_THRESHOLD) {
        snappedY = oB + 6;
        horizontalGuides.push(oB + 6);
      }
      // 3. Directly above with clean 6px gap
      else if (Math.abs(snappedY + height - (oT - 6)) < SNAP_THRESHOLD) {
        snappedY = oT - 6 - height;
        horizontalGuides.push(oT - 6);
      }
      // 4. Center to Center
      else if (Math.abs(snappedY + height / 2 - oCY) < SNAP_THRESHOLD) {
        snappedY = oCY - height / 2;
        horizontalGuides.push(oCY);
      }
      // 5. Bottom to Bottom
      else if (Math.abs(snappedY + height - oB) < SNAP_THRESHOLD) {
        snappedY = oB - height;
        horizontalGuides.push(oB);
      }
    }

    setActiveGuidelines({ vertical: verticalGuides, horizontal: horizontalGuides });

    setFields((prev) =>
      prev.map((f) =>
        f.id === draggingFieldId.current ? { ...f, x: snappedX, y: snappedY } : f
      )
    );
  };

  const handleCanvasMouseUp = () => {
    draggingFieldId.current = null;
    setActiveGuidelines({ vertical: [], horizontal: [] });
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const handleFieldAssign = (fieldId: string, signerId: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, signerId, signer: signers.find((s) => s.id === signerId) }
          : f
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fieldsToSave = fields.map((f) => ({
        signerId: f.signerId,
        fieldType: f.fieldType,
        fieldName: f.fieldName,
        pageNumber: f.pageNumber,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        isRequired: f.isRequired,
        defaultValue: f.defaultValue,
        placeholder: f.placeholder,
        properties: f.properties,
        value: selfSignValues[f.id]?.value || f.value,
        imageData: selfSignValues[f.id]?.imageData || f.imageData,
      }));
      const allSigned = fieldsToSave.length > 0 && fieldsToSave.every((f) => f.value || f.imageData);
      const newStatus = allSigned ? "COMPLETED" : "DRAFT";
      await api.post("/fields/bulk-save", { documentId: id, fields: fieldsToSave });
      setDoc((prev) => (prev ? { ...prev, status: newStatus as any } : prev));
      toast.success(allSigned ? "Document signed & saved as Completed!" : "Document saved!");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // Silent save — used before self-sign so DB errors don't block the flow
  const silentSave = async () => {
    try {
      const fieldsToSave = fields.map((f) => ({
        signerId: f.signerId,
        fieldType: f.fieldType,
        fieldName: f.fieldName,
        pageNumber: f.pageNumber,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        isRequired: f.isRequired,
        defaultValue: f.defaultValue,
        placeholder: f.placeholder,
        properties: f.properties,
      }));
      await api.post("/fields/bulk-save", { documentId: id, fields: fieldsToSave });
    } catch {
      // DB unavailable in demo mode — continue anyway
    }
  };

  const handleSend = async () => {
    if (!fields.length) {
      toast.error("Add at least one signature field before sending.");
      return;
    }
    await handleSave();
    setSending(true);
    try {
      const res = await api.post(`/documents/${id}/send`, { fields });
      setSignerLinks(res.data.signerLinks || []);
      setShowLinksModal(true);
      toast.success("Document sent for signature!");
      setDoc((prev) => prev ? { ...prev, status: "SENT" } : prev);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to send document.");
    } finally {
      setSending(false);
    }
  };

  // Self-sign handler — walks through unsigned fields one by one via SignatureModal
  const unsignedSelfFields = fields.filter((f) => !selfSignValues[f.id]);
  const isAllSelfSigned = fields.length > 0 && unsignedSelfFields.length === 0 && selfSignDone;

  const handleSelfSignStart = async () => {
    if (!fields.length) {
      toast.error("Place at least one field before signing.");
      return;
    }
    const remaining = fields.filter((f) => !selfSignValues[f.id]);
    if (!remaining.length) {
      // Re-sign all
      setSelfSignValues({});
      setSelfSignFieldIndex(0);
    } else {
      setSelfSignFieldIndex(0);
    }
    await silentSave();
    setShowSelfSignModal(true);
  };

  const currentSigningField = (fields.filter((f) => !selfSignValues[f.id])[selfSignFieldIndex]) || fields[selfSignFieldIndex];

  const handleSelfSignCapture = async (data: { type: string; value?: string; imageData?: string }) => {
    const remainingFields = fields.filter((f) => !selfSignValues[f.id]);
    const currentField = remainingFields[selfSignFieldIndex] || fields[selfSignFieldIndex];
    if (!currentField) {
      setShowSelfSignModal(false);
      return;
    }

    const fv = { value: data.value, imageData: data.imageData, signatureType: data.type };
    const updated = { ...selfSignValues, [currentField.id]: fv };
    setSelfSignValues(updated);

    const remainingAfter = fields.filter((f) => !updated[f.id]);
    if (remainingAfter.length > 0) {
      const nextField = remainingAfter[0];
      if (nextField.fieldType === "DATE") {
        const today = new Date().toLocaleDateString("en-US");
        const withDate = { ...updated, [nextField.id]: { value: today, signatureType: "TYPED" } };
        setSelfSignValues(withDate);
        if (fields.filter((f) => !withDate[f.id]).length === 0) {
          setShowSelfSignModal(false);
          completeSelfSign(withDate);
        }
      } else if (nextField.fieldType === "CHECKBOX") {
        const withCheck = { ...updated, [nextField.id]: { value: "checked", signatureType: "TYPED" } };
        setSelfSignValues(withCheck);
        if (fields.filter((f) => !withCheck[f.id]).length === 0) {
          setShowSelfSignModal(false);
          completeSelfSign(withCheck);
        }
      }
    } else {
      setShowSelfSignModal(false);
      completeSelfSign(updated);
    }
  };

  // Direct field fill state (used when clicking a field box directly on canvas)
  const [directFillField, setDirectFillField] = useState<PlacedField | null>(null);

  const handleDirectFieldClick = (field: PlacedField) => {
    setSelectedFieldId(field.id);

    // If field is assigned to a guest recipient (Signer 2 / Client)
    const isAssignedToOther = field.signerId && signers.length > 1 && field.signerId !== signers[0]?.id;
    if (isAssignedToOther) {
      const assignedSigner = signers.find((s) => s.id === field.signerId);
      toast.info(`This field is assigned to ${assignedSigner?.name || "Signer 2"}. They will sign when they open the share link! 📲`);
      return;
    }

    if (field.fieldType === "DATE") {
      const today = new Date().toLocaleDateString("en-US");
      setSelfSignValues((prev) => ({ ...prev, [field.id]: { value: today, signatureType: "TYPED" } }));
      toast.success("Date filled!");
      return;
    }
    if (field.fieldType === "CHECKBOX") {
      setSelfSignValues((prev) => {
        const cur = prev[field.id]?.value;
        const val = cur === "checked" ? "" : "checked";
        return { ...prev, [field.id]: { value: val, signatureType: "TYPED" } };
      });
      return;
    }
    setDirectFillField(field);
  };

  const handleDirectFillCapture = (data: { type: string; value?: string; imageData?: string }) => {
    if (!directFillField) return;
    const fv = { value: data.value, imageData: data.imageData, signatureType: data.type };
    setSelfSignValues((prev) => ({ ...prev, [directFillField.id]: fv }));
    setDirectFillField(null);
    toast.success(`${FIELD_LABELS[directFillField.fieldType]} updated!`);
  };

  const handleClearField = (fieldId: string) => {
    setSelfSignValues((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });
    toast.success("Field value cleared");
  };

  const completeSelfSign = async (values: Record<string, any>) => {
    setSelfSigning(true);
    try {
      await api.post(`/documents/${id}/self-sign`, {
        fields: Object.entries(values).map(([fieldId, val]) => ({ fieldId, ...val }))
      });
    } catch {
      // DB unavailable — still mark as done locally
    } finally {
      setSelfSigning(false);
    }
    setSelfSignDone(true);
    setSelfSignValues(values);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const pageFields = fields.filter((f) => f.pageNumber === currentPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-surface-500">Loading document...</p>
        </div>
      </div>
    );
  }

  // Common ToolBox Content
  const ToolboxContent = (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Signer selector */}
      <div className="p-3 border-b border-surface-100">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
          Active Signer
        </p>
        <div className="space-y-1">
          {signers.map((signer, i) => {
            const color = signer.color || getSignerColor(i);
            return (
              <button
                key={signer.id}
                onClick={() => setSelectedSignerId(signer.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs transition-all",
                  selectedSignerId === signer.id ? "ring-2 ring-offset-1" : "hover:bg-surface-50"
                )}
                style={selectedSignerId === signer.id ? { outlineColor: color } : {}}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {getInitials(signer.name)}
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium text-surface-800 truncate">{signer.name}</p>
                  <p className="text-surface-400 truncate">{signer.email}</p>
                </div>
                {selectedSignerId === signer.id && (
                  <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                )}
              </button>
            );
          })}

          {/* Add Signer Button */}
          {!showAddSigner ? (
            <button
              onClick={() => setShowAddSigner(true)}
              className="flex items-center gap-1.5 w-full mt-2 px-2.5 py-1.5 rounded-lg border border-dashed border-surface-300 text-xs text-surface-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/30 transition-all"
            >
              <Plus size={12} />
              <span>Add Signer {signers.length + 1}</span>
            </button>
          ) : (
            <div className="mt-2 p-2.5 rounded-lg border border-brand-200 bg-brand-50/20 space-y-2">
              <p className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide">Signer {signers.length + 1}</p>
              <input
                autoFocus
                type="text"
                placeholder="Full Name"
                value={newSignerName}
                onChange={(e) => setNewSignerName(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newSignerEmail}
                onChange={(e) => setNewSignerEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSigner()}
                className="w-full px-2 py-1.5 rounded-md border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddSigner}
                  disabled={addingSignerLoading}
                  className="flex-1 py-1.5 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {addingSignerLoading ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={() => { setShowAddSigner(false); setNewSignerName(""); setNewSignerEmail(""); }}
                  className="px-2.5 py-1.5 rounded-md border border-surface-300 text-xs text-surface-600 hover:bg-surface-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Field types */}
      <div className="p-3 flex-1">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
          Add Fields <span className="text-[10px] font-normal text-surface-400">(Drag or Tap)</span>
        </p>
        {FIELD_GROUPS.map((group) => (
          <div key={group.category} className="mb-3">
            <p className="text-[10px] text-surface-400 font-medium mb-1.5 uppercase tracking-wide">{group.category}</p>
            <div className="space-y-1">
              {group.fields.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.type}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      draggingToolField.current = f.type;
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addFieldOnPage(f.type)}
                    className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg border border-surface-200 bg-surface-50 hover:border-brand-300 hover:bg-brand-50/20 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-brand-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-surface-700">{f.label}</span>
                    </div>
                    <Plus size={12} className="text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Common Properties Content
  const PropertiesContent = selectedField ? (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">{FIELD_LABELS[selectedField.fieldType]}</h3>
        <button
          onClick={() => handleDeleteField(selectedField.id)}
          className="p-1 rounded hover:bg-red-50 text-surface-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1 block">Field Name</label>
          <input
            value={selectedField.fieldName}
            onChange={(e) => setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, fieldName: e.target.value } : f))}
            className="w-full px-2.5 py-1.5 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-surface-600 mb-1 block">Assigned To</label>
          <select
            value={selectedField.signerId || ""}
            onChange={(e) => handleFieldAssign(selectedField.id, e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Unassigned</option>
            {signers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={selectedField.isRequired}
              onChange={(e) => setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, isRequired: e.target.checked } : f))}
              className="rounded border-surface-300 text-brand-600"
            />
            <span className="text-xs text-surface-700 font-medium">Required field</span>
          </label>
        </div>

        {/* Vault Presets Auto-Fill Dropdown */}
        <div className="pt-3 border-t border-surface-100">
          <label className="text-xs font-bold text-brand-700 mb-1 flex items-center gap-1">
            ⚡ Quick Fill from Vault Presets
          </label>
          <select
            onChange={(e) => {
              const assetId = e.target.value;
              if (!assetId) return;
              const savedAssets = getSavedAssets();
              const asset = savedAssets.find((a) => a.id === assetId);
              if (asset) {
                const isImg = asset.data.startsWith("data:image");
                const valObj = isImg ? { imageData: asset.data, signatureType: "DRAWN" } : { value: asset.data, signatureType: "TYPED" };
                setFields((prev) =>
                  prev.map((f) => {
                    if (f.id === selectedField.id) {
                      return isImg
                        ? { ...f, imageData: asset.data, value: undefined }
                        : { ...f, value: asset.data, imageData: undefined };
                    }
                    return f;
                  })
                );
                setSelfSignValues((prev) => ({
                  ...prev,
                  [selectedField.id]: valObj,
                }));
                toast.success(`Applied "${asset.name}" to field!`);
              }
              e.target.value = "";
            }}
            className="w-full px-2.5 py-2 rounded-xl border border-brand-300 bg-brand-50/50 text-xs font-semibold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Choose Vault Preset --</option>
            {getSavedAssets().map((a) => (
              <option key={a.id} value={a.id}>
                {a.type === "SIGNATURE" ? "✍️ Signature: " : a.type === "STAMP" ? "💮 Stamp: " : "📝 Detail: "}
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Width</label>
            <input
              type="number"
              value={Math.round(selectedField.width)}
              onChange={(e) => setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, width: +e.target.value } : f))}
              className="w-full px-2 py-1.5 rounded-lg border border-surface-300 text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Height</label>
            <input
              type="number"
              value={Math.round(selectedField.height)}
              onChange={(e) => setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, height: +e.target.value } : f))}
              className="w-full px-2 py-1.5 rounded-lg border border-surface-300 text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Typography & Formatting */}
        <div className="pt-3 border-t border-surface-100 space-y-3">
          <p className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
            <span>🎨 Typography & Ink Color</span>
          </p>

          {/* Font Family */}
          <div>
            <label className="text-[11px] font-medium text-surface-600 mb-1 block">Font Family</label>
            <select
              value={selectedField.properties?.fontFamily || "Inter, system-ui, sans-serif"}
              onChange={(e) => {
                const val = e.target.value;
                setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, properties: { ...f.properties, fontFamily: val } } : f));
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
            >
              <option value="Inter, system-ui, sans-serif">Inter (Modern Sans-Serif)</option>
              <option value="Arial, Helvetica, sans-serif">Arial (Corporate Standard)</option>
              <option value="'Times New Roman', Times, serif">Times New Roman (Legal Contract)</option>
              <option value="Georgia, serif">Georgia (Classic Serif)</option>
              <option value="'Caveat', cursive">Caveat (Natural Handwritten)</option>
              <option value="'Dancing Script', cursive">Dancing Script (Cursive Signature)</option>
              <option value="'Great Vibes', cursive">Great Vibes (Formal Calligraphy)</option>
              <option value="'Courier New', monospace">Courier New (Monospace)</option>
            </select>
          </div>

          {/* Font Size & Weight/Italic */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-surface-600 mb-1 block">Font Size</label>
              <select
                value={selectedField.properties?.fontSize || 14}
                onChange={(e) => {
                  const val = +e.target.value;
                  setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, properties: { ...f.properties, fontSize: val } } : f));
                }}
                className="w-full px-2 py-1.5 rounded-lg border border-surface-300 text-xs focus:outline-none bg-white font-medium"
              >
                {[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40].map((sz) => (
                  <option key={sz} value={sz}>{sz}px</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-surface-600 mb-1 block">Style</label>
              <div className="flex border border-surface-300 rounded-lg overflow-hidden divide-x divide-surface-200">
                <button
                  type="button"
                  onClick={() => {
                    const isBold = selectedField.properties?.fontWeight === "bold";
                    setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, properties: { ...f.properties, fontWeight: isBold ? "normal" : "bold" } } : f));
                  }}
                  className={cn("flex-1 py-1.5 text-xs font-bold text-center transition-colors", selectedField.properties?.fontWeight === "bold" ? "bg-brand-600 text-white" : "bg-white text-surface-700 hover:bg-surface-50")}
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isItalic = selectedField.properties?.fontStyle === "italic";
                    setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, properties: { ...f.properties, fontStyle: isItalic ? "normal" : "italic" } } : f));
                  }}
                  className={cn("flex-1 py-1.5 text-xs italic text-center transition-colors font-serif", selectedField.properties?.fontStyle === "italic" ? "bg-brand-600 text-white" : "bg-white text-surface-700 hover:bg-surface-50")}
                  title="Italic"
                >
                  I
                </button>
              </div>
            </div>
          </div>

          {/* Ink / Text Color */}
          <div>
            <label className="text-[11px] font-medium text-surface-600 mb-1.5 block">Ink & Text Color</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: "Royal Blue Ink", hex: "#1d4ed8" },
                { name: "Classic Navy", hex: "#1e3a8a" },
                { name: "Pure Black", hex: "#0f172a" },
                { name: "Stamp Red", hex: "#b91c1c" },
                { name: "Verified Emerald", hex: "#047857" },
                { name: "Executive Purple", hex: "#6d28d9" },
                { name: "Seal Gold", hex: "#b45309" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, properties: { ...f.properties, color: c.hex } } : f))}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center",
                    (selectedField.properties?.color || "#0f172a") === c.hex ? "border-brand-600 scale-110 ring-2 ring-brand-500/30" : "border-white shadow-xs"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
              <input
                type="color"
                value={selectedField.properties?.color || "#0f172a"}
                onChange={(e) => {
                  const val = e.target.value;
                  setFields((prev) => prev.map((f) => f.id === selectedField.id ? { ...f, properties: { ...f.properties, color: val } } : f));
                }}
                className="w-6 h-6 rounded-full cursor-pointer border border-surface-300 p-0 overflow-hidden"
                title="Custom Color Picker"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-surface-100">
          <p className="text-[10px] text-surface-400">
            Position: {Math.round(selectedField.x)}, {Math.round(selectedField.y)} · Page {selectedField.pageNumber}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-surface-900 mb-1">Properties</h3>
      <p className="text-xs text-surface-400">Select a field to edit properties.</p>

      <div className="mt-6 space-y-3">
        <div className="p-3 rounded-xl bg-surface-50 border border-surface-200">
          <p className="text-xs font-semibold text-surface-600 mb-2">Document Summary</p>
          <div className="space-y-1.5 text-xs text-surface-500">
            <p>{fields.length} field{fields.length !== 1 ? "s" : ""} placed</p>
            <p>{signers.length} signer{signers.length !== 1 ? "s" : ""}</p>
            <p>Page {currentPage} of {pageCount}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-surface-100">
      {/* Self-Sign Signature Modal */}
      {showSelfSignModal && currentSigningField && (
        <SignatureModal
          fieldType={currentSigningField.fieldType}
          signerName="You"
          onCapture={handleSelfSignCapture}
          onClose={() => setShowSelfSignModal(false)}
        />
      )}

      {/* Direct Field Fill/Edit Modal */}
      {directFillField && (
        <SignatureModal
          fieldType={directFillField.fieldType}
          signerName={selfSignValues[directFillField.id]?.value || "You"}
          onCapture={handleDirectFillCapture}
          onClose={() => setDirectFillField(null)}
        />
      )}

      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-surface-200 flex-shrink-0 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate(`/documents/${id}`)}
            className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-800"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="w-px h-4 bg-surface-200 hidden sm:block" />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-surface-900 truncate max-w-[120px] sm:max-w-[200px]">
              {doc?.title || "Untitled Document"}
            </h2>
          </div>
        </div>

        {/* Page, Side & Zoom controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Print Layout Mode selector */}
          <select
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as any)}
            className="px-2 py-1 rounded-lg border border-surface-300 text-xs font-medium text-surface-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            title="Page Printing Layout Mode"
          >
            <option value="SINGLE">📄 Single-Sided (Simplex)</option>
            <option value="DOUBLE_LONG">📑 Double-Sided (Flip Long Edge)</option>
            <option value="DOUBLE_SHORT">📄🔄 Double-Sided (Flip Short Edge)</option>
          </select>

          <div className="w-px h-4 bg-surface-200" />

          {/* Side Indicator Badge */}
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap hidden md:inline-flex",
            printMode === "SINGLE"
              ? "bg-surface-100 border-surface-200 text-surface-600"
              : currentPage % 2 !== 0
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-purple-50 border-purple-200 text-purple-700"
          )}>
            {printMode === "SINGLE"
              ? `Page ${currentPage}`
              : currentPage % 2 !== 0
              ? `Front Side (Page ${currentPage})`
              : `Back Side (Page ${currentPage})`}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded-lg hover:bg-surface-100 disabled:opacity-40 text-surface-600"
          >
            <PrevPage size={16} />
          </button>
          <span className="text-xs text-surface-600 font-medium whitespace-nowrap">
            {currentPage}/{pageCount}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount}
            className="p-1 rounded-lg hover:bg-surface-100 disabled:opacity-40 text-surface-600"
          >
            <NextPage size={16} />
          </button>

          <div className="w-px h-4 bg-surface-200" />

          <button onClick={() => setScale((s) => Math.min(2, s + 0.1))} className="p-1 rounded-lg hover:bg-surface-100 text-surface-600">
            <ZoomIn size={15} />
          </button>
          <span className="text-[11px] text-surface-600 font-medium w-8 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.max(0.4, s - 0.1))} className="p-1 rounded-lg hover:bg-surface-100 text-surface-600">
            <ZoomOut size={15} />
          </button>
        </div>

        {/* Mobile Toolbar Drawer Toggles */}
        <div className="flex items-center gap-1.5 lg:hidden ml-auto">
          <button
            onClick={() => setMobileDrawer(mobileDrawer === "toolbox" ? null : "toolbox")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              mobileDrawer === "toolbox" ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-surface-300 text-surface-700"
            )}
          >
            <Layers size={14} /> Fields
          </button>
          <button
            onClick={() => setMobileDrawer(mobileDrawer === "properties" ? null : "properties")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              mobileDrawer === "properties" ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-surface-300 text-surface-700"
            )}
          >
            <SlidersHorizontal size={14} /> Props
          </button>
        </div>

        {/* Save & Send Actions */}
        <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
          {isAllSelfSigned ? (
            // After signing all fields — show completion banner + Done button
            <>
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Document Signed ✅
              </span>
              <button
                onClick={() => navigate(`/documents/${id}`)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                <Check size={14} /> Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-300 hover:bg-surface-50 text-xs font-medium text-surface-700"
              >
                {saving ? <span className="w-3 h-3 border border-surface-400 border-t-surface-700 rounded-full animate-spin" /> : <Save size={14} />}
                <span className="hidden sm:inline">Save</span>
              </button>
              {signingMode === "SELF" ? (
                <button
                  onClick={handleSelfSignStart}
                  disabled={selfSigning || saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                >
                  {selfSigning ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Pen size={14} />}
                  <span>Sign Now</span>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm"
                >
                  {sending ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                  <span>Send</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP LEFT TOOLBOX */}
        <div className="hidden lg:flex w-52 flex-shrink-0 bg-white border-r border-surface-200 overflow-y-auto flex-col">
          {ToolboxContent}
        </div>

        {/* DESKTOP RIGHT PROPERTIES */}
        {/* Rendered on right side for desktop */}

        {/* CENTER PDF CANVAS */}
        <div className="flex-1 overflow-auto bg-surface-200 flex justify-center p-3 sm:p-6">
          <div className="relative">
            <div
              ref={containerRef}
              className="relative shadow-xl rounded-sm overflow-visible"
              style={{ width: pageSize.width, height: pageSize.height }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onTouchMove={handleCanvasMouseMove}
              onTouchEnd={handleCanvasMouseUp}
              onClick={() => setSelectedFieldId(null)}
            >
              {/* Dynamic Alignment Guide Lines (Cyan Dotted Snapping Lines) */}
              {activeGuidelines.vertical.map((vX, i) => (
                <div
                  key={`v-guide-${i}`}
                  className="absolute pointer-events-none z-50 border-l-2 border-dashed border-cyan-500"
                  style={{ left: vX * scale, top: 0, bottom: 0 }}
                />
              ))}
              {activeGuidelines.horizontal.map((hY, i) => (
                <div
                  key={`h-guide-${i}`}
                  className="absolute pointer-events-none z-50 border-t-2 border-dashed border-cyan-500"
                  style={{ top: hY * scale, left: 0, right: 0 }}
                />
              ))}

              {!pdfDoc && !isImageDoc ? (
                <div style={{ width: pageSize.width, height: pageSize.height }} className="bg-white flex items-center justify-center">
                  <p className="text-surface-400 text-sm">Document preview rendering...</p>
                </div>
              ) : isImageDoc ? (
                <img src={imageDocUrl || ""} alt="Document" className="w-full h-full object-contain block bg-white" />
              ) : (
                <canvas ref={canvasRef} className="pdf-page-canvas block" />
              )}

              {/* Placed fields */}
              {pageFields.map((field) => {
                const signer = field.signer || signers.find((s) => s.id === field.signerId);
                const signerIndex = signers.findIndex((s) => s.id === field.signerId);
                const color = signer?.color || getSignerColor(Math.max(0, signerIndex));
                const isSelected = selectedFieldId === field.id;
                const signedValue = selfSignValues[field.id]; // filled value
                const displayImageData = signedValue?.imageData || field.imageData;
                const displayValue = signedValue?.value || field.value;
                const hasValue = !!(displayImageData || displayValue);

                return (
                  <div
                    key={field.id}
                    className={cn(
                      "document-field rounded transition-all cursor-pointer group",
                      hasValue
                        ? "border-1.5 border-emerald-500/50 bg-transparent hover:border-emerald-600"
                        : "border-1.5",
                      isSelected ? "ring-2 ring-offset-1 ring-brand-500" : "hover:ring-1"
                    )}
                    style={{
                      left: field.x * scale,
                      top: field.y * scale,
                      width: field.width * scale,
                      height: field.height * scale,
                      backgroundColor: hasValue ? "transparent" : `${color}18`,
                      borderColor: hasValue ? "#10b981" : color,
                      borderStyle: hasValue ? "dashed" : "solid",
                      zIndex: isSelected ? 30 : 10,
                    }}
                    onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                    onTouchStart={(e) => handleFieldMouseDown(e, field.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                    onDoubleClick={() => handleDirectFieldClick(field)}
                  >
                    {/* Content inside field */}
                    {hasValue ? (
                      <div className="flex items-center justify-center h-full w-full px-1 overflow-hidden relative bg-transparent">
                        {displayImageData ? (
                          <img
                            src={displayImageData}
                            alt="Signed"
                            className="max-w-full max-h-full object-contain p-0.5 bg-transparent"
                            style={{
                              filter: field.properties?.color ? `drop-shadow(0 0 0 ${field.properties.color})` : undefined
                            }}
                          />
                        ) : (
                          <span
                            className="truncate px-1 bg-transparent"
                            style={{
                              color: field.properties?.color || "#0f172a",
                              fontFamily: field.properties?.fontFamily || "inherit",
                              fontSize: field.properties?.fontSize ? `${field.properties.fontSize}px` : "13px",
                              fontWeight: field.properties?.fontWeight || "bold",
                              fontStyle: field.properties?.fontStyle || "normal",
                            }}
                          >
                            {displayValue === "checked" ? "✓ Checked" : displayValue}
                          </span>
                        )}
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-600 border border-white flex items-center justify-center shadow-sm">
                          <Check size={8} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-between px-1.5 h-full overflow-hidden"
                        style={{
                          fontSize: field.properties?.fontSize ? `${field.properties.fontSize}px` : Math.max(8, 10 * scale),
                          fontFamily: field.properties?.fontFamily || "inherit",
                          fontWeight: field.properties?.fontWeight || "semibold",
                          fontStyle: field.properties?.fontStyle || "normal",
                        }}
                      >
                        <span className="truncate" style={{ color: field.properties?.color || color }}>
                          {FIELD_LABELS[field.fieldType]}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDirectFieldClick(field); }}
                          className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: field.signerId && field.signerId !== signers[0]?.id ? color : "#0f172a" }}
                          title={field.signerId && field.signerId !== signers[0]?.id ? `Assigned to ${signer?.name || "Client"}` : "Click to fill/sign this field"}
                        >
                          {field.signerId && field.signerId !== signers[0]?.id ? `For ${signer?.name?.split(" ")[0] || "Client"}` : "Fill"}
                        </button>
                      </div>
                    )}

                    {/* Field Signer Label */}
                    <div
                      className="absolute -top-5 left-0 px-1 py-0.5 rounded-t text-[8px] font-semibold text-white flex items-center gap-1 whitespace-nowrap"
                      style={{ backgroundColor: hasValue ? "#059669" : color }}
                    >
                      {signer ? getInitials(signer.name) : "?"}
                    </div>

                    {/* Action Toolbar on Hover / Select (Edit ✏️, Clear 🔄, Delete 🗑️) */}
                    {isSelected && (
                      <div className="absolute -top-6 right-0 flex items-center gap-0.5 bg-surface-900 rounded p-0.5 shadow-lg z-50">
                        {hasValue && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDirectFieldClick(field); }}
                            className="p-1 hover:bg-surface-700 text-white rounded text-[10px] flex items-center gap-0.5"
                            title="Edit field value"
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                        {hasValue && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleClearField(field.id); }}
                            className="p-1 hover:bg-surface-700 text-amber-300 rounded text-[10px]"
                            title="Clear value"
                          >
                            <RotateCcw size={10} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                          className="p-1 hover:bg-red-600 text-white rounded text-[10px]"
                          title="Delete field"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DESKTOP RIGHT PROPERTIES PANEL */}
        <div className="hidden lg:block w-60 flex-shrink-0 bg-white border-l border-surface-200 overflow-y-auto">
          {PropertiesContent}
        </div>

        {/* MOBILE DRAWER OVERLAY */}
        {mobileDrawer && (
          <div className="fixed inset-0 z-40 lg:hidden flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileDrawer(null)} />
            <div className="relative bg-white rounded-t-2xl shadow-modal max-h-[70vh] flex flex-col z-10 animate-slide-up">
              <div className="flex items-center justify-between p-3 border-b border-surface-100 flex-shrink-0">
                <h3 className="text-sm font-bold text-surface-900">
                  {mobileDrawer === "toolbox" ? "Field Toolbox" : "Field Properties"}
                </h3>
                <button onClick={() => setMobileDrawer(null)} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {mobileDrawer === "toolbox" ? ToolboxContent : PropertiesContent}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signing Links Modal */}
      {showLinksModal && (
        <SigningLinksModal
          links={signerLinks}
          documentId={id}
          documentTitle={doc?.title}
          onClose={() => { setShowLinksModal(false); navigate(`/documents/${id}`); }}
        />
      )}
    </div>
  );
}
