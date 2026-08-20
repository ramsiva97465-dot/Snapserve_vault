export interface SavedAsset {
  id: string;
  type: "SIGNATURE" | "STAMP" | "LOGO" | "TEXT";
  name: string;
  data: string; // base64 image or text string
  createdAt: string;
}

// Generate pure PNG data URLs for default assets so pdf-lib embeds them seamlessly
function createDefaultPngSignature(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(25, 60);
    ctx.bezierCurveTo(60, 20, 90, 80, 130, 40);
    ctx.bezierCurveTo(160, 20, 200, 70, 240, 45);
    ctx.stroke();

    ctx.font = "bold italic 22px Georgia, serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText("SIVARAM R S", 30, 85);
  }
  return canvas.toDataURL("image/png");
}

function createDefaultPngStamp(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#f0f9ff";
    ctx.beginPath();
    ctx.arc(80, 80, 74, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(80, 80, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#0369a1";
    ctx.textAlign = "center";
    ctx.fillText("SNAPSERVE", 80, 70);

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText("★ OFFICIAL ★", 80, 95);
  }
  return canvas.toDataURL("image/png");
}

export function getSavedAssets(): SavedAsset[] {
  try {
    const raw = localStorage.getItem("snapserve_vault_assets_v2");
    if (raw) return JSON.parse(raw);

    const defaultAssets: SavedAsset[] = [
      {
        id: "sig-default-1",
        type: "SIGNATURE",
        name: "SIVARAM R S (Official Signature)",
        data: createDefaultPngSignature(),
        createdAt: new Date().toISOString(),
      },
      {
        id: "stamp-default-1",
        type: "STAMP",
        name: "Snapserve Vault Official Seal",
        data: createDefaultPngStamp(),
        createdAt: new Date().toISOString(),
      },
      {
        id: "detail-default-1",
        type: "TEXT",
        name: "Owner Contact Info",
        data: "SIVARAM R S | [EMAIL_ADDRESS]",
        createdAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem("snapserve_vault_assets_v2", JSON.stringify(defaultAssets));
    return defaultAssets;
  } catch {
    return [];
  }
}

export function saveAsset(asset: Omit<SavedAsset, "id" | "createdAt">): SavedAsset[] {
  const current = getSavedAssets();
  const newAsset: SavedAsset = {
    ...asset,
    id: `asset-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newAsset, ...current];
  localStorage.setItem("snapserve_vault_assets_v2", JSON.stringify(updated));
  return updated;
}

export function deleteAsset(id: string): SavedAsset[] {
  const current = getSavedAssets();
  const updated = current.filter((a) => a.id !== id);
  localStorage.setItem("snapserve_vault_assets_v2", JSON.stringify(updated));
  return updated;
}
