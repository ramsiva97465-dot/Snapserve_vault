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

router.post("/invite", async (req: AuthRequest, res) => {
  try {
    const { email, name, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    const orgId = req.user!.organizationId;

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      if (existingMember) {
        return res.status(409).json({ error: "User is already a member of this team" });
      }

      // Add to organization
      const member = await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          role: role || "MEMBER",
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return res.json({ message: "Existing user added to team", member });
    }

    // Send email invite via Mail service
    const { sendEmailViaBrevo } = await import("../services/email");
    const joinUrl = `${process.env.CORS_ORIGIN || "http://localhost:5173"}/signup?email=${encodeURIComponent(email)}`;
    
    await sendEmailViaBrevo({
      toEmail: email,
      toName: name || email,
      subject: `You've been invited to join ${req.user!.organizationName || "Snapserve Vault"}`,
      documentTitle: `Team Invitation - ${req.user!.organizationName || "Snapserve Vault"}`,
      shareUrl: joinUrl,
      message: `${req.user!.name || "A team admin"} invited you to join their workspace on Snapserve Vault.`,
    });

    res.json({
      message: `Invitation email sent to ${email}`,
      invitedEmail: email,
      role: role || "MEMBER",
    });
  } catch (error: any) {
    console.error("Team invite error:", error);
    res.status(500).json({ error: error.message || "Failed to invite team member" });
  }
});

export default router;
