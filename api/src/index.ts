import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import documentRoutes from "./routes/documents";
import signerRoutes from "./routes/signers";
import fieldRoutes from "./routes/fields";
import signingRoutes from "./routes/signing";
import templateRoutes from "./routes/templates";
import contactRoutes from "./routes/contacts";
import teamRoutes from "./routes/team";
import analyticsRoutes from "./routes/analytics";
import notificationRoutes from "./routes/notifications";
import auditRoutes from "./routes/audit";

import compression from "compression";

const app = express();
const PORT = process.env.PORT || 3001;

// Enable gzip compression for 10x faster API responses
app.use(compression());

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: "*",
  credentials: true,
}));

// Generous Rate limiting for local dev
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/signers", signerRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/signing", signingRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit", auditRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

import fs from "fs";

// Static files for frontend build (Single Service deployment)
const webDistPath = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDistPath)) {
  console.log(`📦 Serving web frontend from ${webDistPath}`);
  app.use(express.static(webDistPath, {
    maxAge: "1y",
    immutable: true,
    index: false,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  }));

  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/assets") ||
      req.path === "/health" ||
      /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map|json)$/i.test(req.path)
    ) {
      return res.status(404).send("Asset not found");
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(webDistPath, "index.html"));
  });
} else {
  // Fallback 404 handler if web/dist is not built
  app.use((req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/assets") ||
      req.path === "/health" ||
      /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map|json)$/i.test(req.path)
    ) {
      return res.status(404).send("Asset not found");
    }
    res.status(404).json({ error: "Frontend build not found. Run 'npm run build' in /web directory." });
  });
}

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

import http from "http";
import { initSocket } from "./utils/socket";

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Snapserve.ai API & WebSockets running on http://localhost:${PORT}`);
});

export default app;
