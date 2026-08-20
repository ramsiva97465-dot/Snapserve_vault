import { useState, useRef, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { User, Shield, PenTool, Upload, Trash2, Plus, Stamp, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getInitials, cn } from "@/lib/utils";
import { getSavedAssets, saveAsset, deleteAsset, SavedAsset } from "@/lib/vault";
import { toast } from "sonner";

const SETTINGS_NAV = [
  { path: "", label: "Profile", icon: User },
  { path: "assets", label: "Signatures & Stamps Vault", icon: PenTool },
  { path: "security", label: "Security", icon: Shield },
];

function ProfileSettings() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [organizationName, setOrganizationName] = useState(user?.organizationName || "Snapserve Vault");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setOrganizationName(user.organizationName || "Snapserve Vault");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSave = () => {
    updateUser({
      name,
      email,
      organizationName,
      phone,
    });
    toast.success("Profile details updated successfully!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-surface-950 mb-4">Owner Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {getInitials(name || user?.name || "U")}
          </div>
          <div>
            <p className="font-bold text-surface-900 text-lg">{name || user?.name || "User"}</p>
            <p className="text-surface-500 text-sm">{email || user?.email || ""}</p>
            <span className="inline-block mt-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-semibold">
              Document Owner
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">Organization</label>
            <input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className="mt-5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function VaultAssetsSettings() {
  const [assets, setAssets] = useState<SavedAsset[]>(getSavedAssets());
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetType, setAssetType] = useState<"SIGNATURE" | "STAMP" | "TEXT">("SIGNATURE");
  const [sigMode, setSigMode] = useState<"DRAW" | "UPLOAD">("DRAW");
  const [assetName, setAssetName] = useState("");
  const [textValue, setTextValue] = useState("");
  const [imageData, setImageData] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Setup drawing canvas
  useEffect(() => {
    if (showAddModal && assetType === "SIGNATURE" && sigMode === "DRAW" && sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [showAddModal, assetType, sigMode]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (sigCanvasRef.current) {
      setImageData(sigCanvasRef.current.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    if (sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
      setImageData("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setImageData(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewAsset = () => {
    if (!assetName.trim()) {
      toast.error("Please enter a name for this signature/preset.");
      return;
    }

    let finalData = assetType === "TEXT" ? textValue : imageData;
    if (assetType === "SIGNATURE" && sigMode === "DRAW" && sigCanvasRef.current) {
      finalData = sigCanvasRef.current.toDataURL("image/png");
    }

    if (!finalData) {
      toast.error("Please draw a signature or upload an image.");
      return;
    }

    const updated = saveAsset({
      type: assetType,
      name: assetName,
      data: finalData,
    });
    setAssets(updated);
    toast.success(`Saved "${assetName}" to Owner Vault!`);
    setShowAddModal(false);
    setAssetName("");
    setTextValue("");
    setImageData("");
  };

  const handleDelete = (id: string, name: string) => {
    const updated = deleteAsset(id);
    setAssets(updated);
    toast.success(`Deleted "${name}"`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-surface-950 flex items-center gap-2">
            <PenTool size={20} className="text-brand-600" /> Owner Signatures & Stamps Vault
          </h2>
          <p className="text-xs text-surface-500 mt-1">
            Pre-save multiple official signatures, seals, and details here so you can 1-click select them inside the Document Editor!
          </p>
        </div>
        <button
          onClick={() => {
            setAssetName(`Signature ${assets.filter((a) => a.type === "SIGNATURE").length + 1}`);
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} /> Add New Signature / Asset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="p-4 rounded-2xl border border-surface-200 bg-surface-50/50 hover:bg-white transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-surface-900 flex items-center gap-1.5">
                {asset.type === "SIGNATURE" && <PenTool size={14} className="text-brand-600" />}
                {asset.type === "STAMP" && <Stamp size={14} className="text-amber-600" />}
                {asset.type === "TEXT" && <User size={14} className="text-emerald-600" />}
                {asset.name}
              </span>
              <button
                onClick={() => handleDelete(asset.id, asset.name)}
                className="p-1 rounded-lg hover:bg-rose-50 text-surface-400 hover:text-rose-600 transition-colors"
                title="Delete Asset"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-surface-200 p-3 min-h-[90px] flex items-center justify-center">
              {asset.data.startsWith("data:image") ? (
                <img src={asset.data} alt={asset.name} className="max-h-20 object-contain" />
              ) : (
                <span className="text-xs font-medium text-surface-800 text-center">{asset.data}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Signature / Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-base font-bold text-surface-950 mb-4">Add Preset to Owner Vault</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1.5">Asset Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["SIGNATURE", "Signature"],
                    ["STAMP", "Stamp / Seal"],
                    ["TEXT", "Contact Info"],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAssetType(type as any)}
                      className={cn(
                        "py-2 text-xs font-bold rounded-xl border transition-all",
                        assetType === type
                          ? "border-brand-600 bg-brand-50 text-brand-700"
                          : "border-surface-200 hover:bg-surface-50 text-surface-600"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Name / Title</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Primary Legal Signature, Blue Ink Sign..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              {assetType === "SIGNATURE" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-surface-700">Signature Input</label>
                    <div className="flex gap-1 bg-surface-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSigMode("DRAW")}
                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", sigMode === "DRAW" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600")}
                      >
                        ✏️ Draw Pad
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigMode("UPLOAD")}
                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", sigMode === "UPLOAD" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600")}
                      >
                        📤 Upload PNG
                      </button>
                    </div>
                  </div>

                  {sigMode === "DRAW" ? (
                    <div className="space-y-2">
                      <div className="border border-surface-300 rounded-xl overflow-hidden bg-white shadow-inner relative">
                        <canvas
                          ref={sigCanvasRef}
                          width={380}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full cursor-crosshair touch-none"
                        />
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs font-medium flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-surface-300 hover:border-brand-500 rounded-xl bg-surface-50 text-xs font-semibold text-surface-600 flex items-center justify-center gap-2"
                      >
                        <Upload size={16} /> Choose Signature File
                      </button>
                      {imageData && (
                        <div className="mt-2 p-2 bg-surface-100 rounded-xl flex items-center justify-center max-h-20">
                          <img src={imageData} alt="Preview" className="max-h-16 object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {assetType === "STAMP" && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Upload Stamp / Seal Image (PNG / SVG)</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-surface-300 hover:border-brand-500 rounded-xl bg-surface-50 text-xs font-semibold text-surface-600 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} /> Select Seal / Stamp Image
                  </button>
                  {imageData && (
                    <div className="mt-2 p-2 bg-surface-100 rounded-xl flex items-center justify-center max-h-20">
                      <img src={imageData} alt="Preview" className="max-h-16 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {assetType === "TEXT" && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Text Detail</label>
                  <input
                    type="text"
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder="e.g. John Doe | john@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-surface-300 text-xs font-semibold text-surface-600 hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewAsset}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
              >
                Save Signature / Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-surface-950">Security</h2>
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <h3 className="font-semibold text-surface-900 mb-4">Change Password</h3>
        <div className="space-y-3">
          {["Current Password", "New Password", "Confirm New Password"].map((label) => (
            <div key={label}>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
              <input
                type="password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
          <button className="px-5 py-2.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-semibold">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const location = useLocation();
  const currentPath = location.pathname.replace("/settings", "").replace("/", "");

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-950">Settings & Owner Vault</h1>
        <p className="text-surface-500 text-sm mt-1">Manage your account profile and pre-saved signatures, stamps, and presets.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nav */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
            {SETTINGS_NAV.map((item) => {
              const isActive = currentPath === item.path || (item.path === "" && !currentPath);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={`/settings/${item.path}`}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b border-surface-50 last:border-0 transition-colors",
                    isActive ? "bg-brand-50 text-brand-700 font-semibold" : "text-surface-700 hover:bg-surface-50"
                  )}
                >
                  <Icon size={15} className={isActive ? "text-brand-600" : "text-surface-500"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-surface-200 shadow-card p-6">
          <Routes>
            <Route index element={<ProfileSettings />} />
            <Route path="assets" element={<VaultAssetsSettings />} />
            <Route path="security" element={<SecuritySettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
