import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

const DEFAULT_DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "ramsiva97465@gmail.com",
  organizationId: "00000000-0000-0000-0000-000000000002",
  role: "OWNER",
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Ensure demo org and user exist in Prisma DB so queries never fail on foreign keys
    try {
      await prisma.organization.upsert({
        where: { id: DEFAULT_DEMO_USER.organizationId },
        update: {},
        create: {
          id: DEFAULT_DEMO_USER.organizationId,
          name: "Snapserve Vault",
        },
      });

      await prisma.user.upsert({
        where: { id: DEFAULT_DEMO_USER.id },
        update: {},
        create: {
          id: DEFAULT_DEMO_USER.id,
          name: "SIVARAM R S",
          email: DEFAULT_DEMO_USER.email,
          passwordHash: "hashedpassword",
        },
      });

      await prisma.organizationMember.upsert({
        where: { id: "00000000-0000-0000-0000-000000000003" },
        update: {},
        create: {
          id: "00000000-0000-0000-0000-000000000003",
          userId: DEFAULT_DEMO_USER.id,
          organizationId: DEFAULT_DEMO_USER.organizationId,
          role: "OWNER",
        },
      });
    } catch {}

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = DEFAULT_DEMO_USER;
      return next();
    }

    const token = authHeader.substring(7);
    
    let decoded: any;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret_key_change_in_prod"
      );
    } catch {
      // Fallback for non-JWT demo token
      req.user = DEFAULT_DEMO_USER;
      return next();
    }

    try {
      const member = await prisma.organizationMember.findFirst({
        where: { userId: decoded.userId },
        include: { user: true },
      });

      if (member) {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          organizationId: member.organizationId,
          role: member.role,
        };
        return next();
      }
    } catch {
      // Fallback if DB lookup fails
    }

    // Fallback user object
    req.user = {
      id: decoded.userId || DEFAULT_DEMO_USER.id,
      email: decoded.email || DEFAULT_DEMO_USER.email,
      organizationId: DEFAULT_DEMO_USER.organizationId,
      role: DEFAULT_DEMO_USER.role,
    };

    next();
  } catch (error) {
    req.user = DEFAULT_DEMO_USER;
    next();
  }
};
