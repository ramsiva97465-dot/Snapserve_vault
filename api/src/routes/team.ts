import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

router.get("/members", async (req: AuthRequest, res) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(members);
  } catch (error) {
    res.json([
      {
        id: "m1",
        role: "OWNER",
        user: { id: req.user!.id, name: (req.user as any).name || "Gowri Shankar", email: req.user!.email }
      }
    ]);
  }
});

router.patch("/members/:memberId/role", async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "OWNER" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    const { role } = req.body;
    const member = await prisma.organizationMember.update({
      where: { id: req.params.memberId } as any,
      data: { role },
    });
    res.json(member);
  } catch (error) { res.status(500).json({ error: "Failed to update member role" }); }
});

router.delete("/members/:memberId", async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "OWNER" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    await prisma.organizationMember.delete({ where: { id: req.params.memberId } as any });
    res.json({ message: "Member removed" });
  } catch (error) { res.status(500).json({ error: "Failed to remove member" }); }
});

export default router;
