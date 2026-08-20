import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
    name?: string;
    organizationName?: string;
  };
}



export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }

    const token = authHeader.substring(7);

    let decoded: any;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret_key_change_in_prod"
      );
    } catch {
      return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
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
      // DB connection lookup note
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      organizationId: decoded.organizationId || "00000000-0000-0000-0000-000000000002",
      role: decoded.role || "MEMBER",
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed. Please log in." });
  }
};
