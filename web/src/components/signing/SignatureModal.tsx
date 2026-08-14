import { useRef, useState, useEffect } from "react";
import { X, PenTool, Type, Upload, Check, RotateCcw, FileText } from "lucide-react";
import { FieldType, FIELD_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  fieldType: FieldType;
  signerName: string;
  onCapture: (data: { type: string; value?: string; imageData?: string }) => void;
  onClose: () => void;
}

const SIGNATURE_STYLES = [
  { name: "Elegant", fontClass: "font-serif italic text-2xl", canvasFont: "italic bold 36px Georgia, serif" },
  { name: "Modern", fontClass: "font-sans text-xl font-light", canvasFont: "30px Inter, system-ui, sans-serif" },
  { name: "Bold", fontClass: "font-sans text-xl font-bold", canvasFont: "bold 32px Inter, system-ui, sans-serif" },
  { name: "Script", fontClass: "italic text-2xl", canvasFont: "italic 36px 'Brush Script MT', cursive, Georgia, serif" },
];

const IS_SIGNATURE_LIKE = (type: FieldType) => type === "SIGNATURE" || type === "INITIALS" || type === "SEAL";

export default function SignatureModal({ fieldType, signerName, onCapture, onClose }: Props) {
  const isSig = IS_SIGNATURE_LIKE(fieldType);

  const [tab, setTab] = useState<"type" | "draw" | "upload">(fieldType === "INITIALS" ? "type" : isSig ? "draw" : "type");
  const [typedValue, setTypedValue] = useState(
    fieldType === "INITIALS" ? (signerName === "You" ? "" : signerName) : (signerName === "You" ? "" : signerName || "")
  );
  const [selectedStyle, setSelectedStyle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const modalTitle = isSig
    ? fieldType === "INITIALS" ? "Add Initials" : fieldType === "SEAL" ? "Add Seal" : "Add Signature"
    : `Fill ${FIELD_LABELS[fieldType] || "Field"}`;

  useEffect(() => {
    if (tab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [tab]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApply = () => {
    if (!isSig) {
      // Plain text / details field
      if (!typedValue.trim()) return;
      onCapture({ type: "TYPED", value: typedValue });
      return;
    }

    if (tab === "type") {
      if (!typedValue.trim()) return;
      const font = SIGNATURE_STYLES[selectedStyle]?.canvasFont || "italic bold 36px Georgia, serif";
      const offCanvas = document.createElement("canvas");
      offCanvas.width = 400;
      offCanvas.height = 120;
      const ctx = offCanvas.getContext("2d")!;
      // Clear canvas — 100% transparent background (no solid white fill!)
      ctx.clearRect(0, 0, 400, 120);
      ctx.fillStyle = "#0f172a";
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedValue, 200, 60);
      const imageData = offCanvas.toDataURL("image/png");
      onCapture({ type: "TYPED", value: typedValue, imageData });
    } else if (tab === "draw") {
      const canvas = canvasRef.current!;
      const imageData = canvas.toDataURL("image/png");
      onCapture({ type: "DRAWN", imageData });
    }
  };

  // Helper to remove white background from uploaded images
  const processUploadedImage = (dataUrl: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;
      // Make near-white pixels transparent (R, G, B > 230)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) {
          data[i + 3] = 0; // Alpha 0
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const transparentDataUrl = canvas.toDataURL("image/png");
      onCapture({ type: "UPLOADED", imageData: transparentDataUrl });
    };
    img.src = dataUrl;
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target?.result as string;
      processUploadedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const tabs = fieldType === "SEAL"
    ? [{ id: "upload" as const, label: "Upload", icon: Upload }]
    : [
        { id: "draw" as const, label: "Draw", icon: PenTool },
        { id: "type" as const, label: "Type", icon: Type },
        { id: "upload" as const, label: "Upload", icon: Upload },
      ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-modal w-full sm:max-w-md animate-slide-up sm:animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h2 className="text-base font-bold text-surface-950">{modalTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs for Signature/Initials/Seal */}
        {isSig && (
          <div className="flex p-3 gap-1 border-b border-surface-100">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === t.id ? "bg-surface-950 text-white" : "text-surface-500 hover:bg-surface-100"
                )}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {!isSig ? (
            // Plain text / details field input
            <div>
              <p className="text-xs text-surface-500 mb-2">Enter value for {FIELD_LABELS[fieldType] || "this field"}:</p>
              {fieldType === "ADDRESS" ? (
                <textarea
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Enter full address..."
                  autoFocus
                />
              ) : (
                <input
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  type={fieldType === "EMAIL" ? "email" : fieldType === "NUMBER" ? "number" : fieldType === "PHONE" ? "tel" : "text"}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={`Enter ${FIELD_LABELS[fieldType] || "text"}...`}
                  autoFocus
                />
              )}
            </div>
          ) : (
            // Signature / Initials / Seal modal content
            <>
              {tab === "draw" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-surface-500">Draw your signature below</p>
                    <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-700">
                      <RotateCcw size={12} /> Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="signature-canvas w-full rounded-xl border-2 border-surface-200 touch-none"
                    style={{ maxHeight: 150 }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>
              )}

              {tab === "type" && (
                <div>
                  <p className="text-xs text-surface-500 mb-2">Type text to generate signature style</p>
                  <input
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Type name or initials"
                    autoFocus
                  />
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {SIGNATURE_STYLES.map((style, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedStyle(i)}
                        className={cn(
                          "w-full py-3 px-4 rounded-lg border text-left transition-all",
                          selectedStyle === i ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20" : "border-surface-200 hover:border-surface-300"
                        )}
                      >
                        <span className={cn(style.fontClass, "text-surface-950 block truncate")}>
                          {typedValue || "Your Signature"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === "upload" && (
                <div>
                  <p className="text-xs text-surface-500 mb-3">
                    {fieldType === "SEAL" ? "Upload your organization seal or stamp" : "Upload a signature image (PNG or JPG with transparent background)"}
                  </p>
                  <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-300 hover:bg-brand-50/20 cursor-pointer transition-all">
                    <Upload size={24} className="text-brand-600" />
                    <span className="text-sm text-surface-600 font-medium">Click to upload</span>
                    <span className="text-xs text-surface-400">PNG, JPG · Max 5MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-surface-300 text-sm font-semibold text-surface-700"
          >
            Cancel
          </button>
          {(tab !== "upload" || !isSig) && (
            <button
              onClick={handleApply}
              disabled={!typedValue.trim() && (tab === "type" || !isSig)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Check size={16} /> Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
