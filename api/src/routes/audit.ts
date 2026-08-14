import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

router.get("/:documentId", async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { documentId: req.params.documentId as string },
      orderBy: { createdAt: "asc" },
    });
    res.json(logs);
  } catch (error) { res.status(500).json({ error: "Failed to fetch audit logs" }); }
});

export default router;
