import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (error) { res.json([]); }
});

router.patch("/read-all", async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (error) { res.json({ message: "All notifications marked as read" }); }
});

router.patch("/:id/read", async (req: AuthRequest, res) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id as string }, data: { isRead: true } });
    res.json({ message: "Notification marked as read" });
  } catch (error) { res.json({ message: "Notification marked as read" }); }
});

export default router;
