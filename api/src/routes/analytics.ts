import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { inMemoryStore } from "../utils/store";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const dbPromise = Promise.all([
      prisma.document.count({ where: { ownerId: userId } }),
      prisma.document.count({ where: { ownerId: userId, status: "SENT" } }),
      prisma.document.count({ where: { ownerId: userId, status: "COMPLETED" } }),
      prisma.document.count({ where: { ownerId: userId, status: "DRAFT" } }),
      prisma.document.count({ where: { ownerId: userId, status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED"] } } }),
      prisma.document.count({ where: { ownerId: userId, status: "EXPIRED" } }),
    ]);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB Timeout")), 1500)
    );

    const [total, sent, completed, drafts, awaitingSignature, expired]: any = await Promise.race([
      dbPromise,
      timeoutPromise,
    ]);

    const memDocs = inMemoryStore.documents;
    const memTotal = memDocs.length;
    const memSent = memDocs.filter((d) => d.status === "SENT").length;
    const memCompleted = memDocs.filter((d) => d.status === "COMPLETED").length;
    const memDrafts = memDocs.filter((d) => d.status === "DRAFT").length;
    const memAwaiting = memDocs.filter((d) => ["SENT", "VIEWED", "PARTIALLY_SIGNED", "PREPARING"].includes(d.status)).length;

    return res.json({
      stats: {
        total: total || memTotal,
        sent: sent || memSent,
        completed: completed || memCompleted,
        drafts: drafts || memDrafts,
        awaitingSignature: awaitingSignature || memAwaiting,
        expired: expired || 0,
        completionRate: (total || memTotal) > 0 ? Math.round(((completed || memCompleted) / (total || memTotal)) * 100) : 0,
      },
      recentActivity: [],
      monthlyDocs: [],
    });
  } catch (error) {
    const memDocs = inMemoryStore.documents;
    const memTotal = memDocs.length;
    const memSent = memDocs.filter((d) => d.status === "SENT").length;
    const memCompleted = memDocs.filter((d) => d.status === "COMPLETED").length;
    const memDrafts = memDocs.filter((d) => d.status === "DRAFT").length;
    const memAwaiting = memDocs.filter((d) => ["SENT", "VIEWED", "PARTIALLY_SIGNED", "PREPARING"].includes(d.status)).length;

    return res.json({
      stats: {
        total: memTotal,
        sent: memSent,
        completed: memCompleted,
        drafts: memDrafts,
        awaitingSignature: memAwaiting,
        expired: 0,
        completionRate: memTotal > 0 ? Math.round((memCompleted / memTotal) * 100) : 0,
      },
      recentActivity: [],
      monthlyDocs: [],
    });
  }
});

export default router;
