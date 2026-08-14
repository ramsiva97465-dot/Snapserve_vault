import { prisma } from "./prisma";

interface AuditParams {
  action: string;
  documentId?: string;
  userId?: string;
  actorName?: string;
  actorEmail?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export const logAudit = async (params: AuditParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action as any,
        documentId: params.documentId,
        userId: params.userId,
        actorName: params.actorName,
        actorEmail: params.actorEmail,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
};
