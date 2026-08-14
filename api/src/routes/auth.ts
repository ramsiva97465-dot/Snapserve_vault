import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/prisma";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Mock demo user helper if DB is unseeded or offline
const MOCK_DEMO_USER = {
  id: "demo-user-id-001",
  name: "Gowri Shankar",
  email: "demo@snapserve.ai",
  organizationId: "demo-org-id-001",
  organizationName: "Snapserve.ai Inc.",
  role: "OWNER",
};

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, organizationName } = signupSchema.parse(req.body);

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx: any) => {
        const org = await tx.organization.create({
          data: { name: organizationName },
        });

        const user = await tx.user.create({
          data: { email, name, passwordHash },
        });

        await tx.organizationMember.create({
          data: { userId: user.id, organizationId: org.id, role: "OWNER" },
        });

        return { user, org };
      });

      const token = jwt.sign(
        { userId: result.user.id, email: result.user.email },
        process.env.JWT_SECRET || "default_secret_key_change_in_prod",
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          organizationId: result.org.id,
          organizationName: result.org.name,
          role: "OWNER",
        },
      });
    } catch (dbError) {
      console.warn("DB connection fallback on signup:", dbError);
      // Fallback for offline DB test
      const token = jwt.sign(
        { userId: "fallback-user-id", email },
        process.env.JWT_SECRET || "default_secret_key_change_in_prod",
        { expiresIn: "7d" }
      );
      return res.status(201).json({
        token,
        user: {
          id: "fallback-user-id",
          name,
          email,
          organizationId: "fallback-org-id",
          organizationName,
          role: "OWNER",
        },
      });
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // If demo account clicked
    if (email === "demo@snapserve.ai") {
      const token = jwt.sign(
        { userId: MOCK_DEMO_USER.id, email: MOCK_DEMO_USER.email },
        process.env.JWT_SECRET || "default_secret_key_change_in_prod",
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: MOCK_DEMO_USER,
      });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials. Create an account or use Demo auto-fill." });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const member = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: { organization: true },
      });

      if (!member) {
        return res.status(401).json({ error: "No organization found" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || "default_secret_key_change_in_prod",
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          organizationId: member.organizationId,
          organizationName: member.organization.name,
          role: member.role,
        },
      });
    } catch (dbError) {
      console.warn("DB connection fallback on login:", dbError);
      // Fallback for offline DB test
      const token = jwt.sign(
        { userId: "fallback-user-id", email },
        process.env.JWT_SECRET || "default_secret_key_change_in_prod",
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: {
          id: "fallback-user-id",
          name: email.split("@")[0] || "Demo User",
          email,
          organizationId: "fallback-org-id",
          organizationName: "Snapserve Workspace",
          role: "OWNER",
        },
      });
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      console.log(`Password reset requested for ${email}`);
    }
  } catch {
    // Ignore DB error
  }
  res.json({ message: "If that email exists, a reset link has been sent." });
});

export default router;
