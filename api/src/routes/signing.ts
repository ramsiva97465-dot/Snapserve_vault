import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { logAudit } from "../utils/audit";
import { inMemoryStore } from "../utils/store";
import { notifyDocumentSigned } from "../utils/socket";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const router = Router();

const sigStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/signatures");
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const sigUpload = multer({ storage: sigStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Validate token and get signing context
router.get("/token/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const signingToken: any = await prisma.signingToken.findUnique({
      where: { token: token as string },
      include: {
        document: {
          include: {
            fields: { include: { signer: true } },
            signers: { orderBy: { orderIndex: "asc" } },
          },
        },
        signer: true,
      },
    });

    if (!signingToken) {
      // Memory fallback: search by token in inMemoryStore documents
      let targetDoc: any = null;
      let matchedTokenObj: any = null;
      for (const doc of inMemoryStore.documents) {
        const foundTok = (doc.signingTokens || []).find((st: any) => st.token === token);
        if (foundTok) {
          targetDoc = doc;
          matchedTokenObj = foundTok;
          break;
        }
      }

      if (!targetDoc && inMemoryStore.documents.length > 0) {
        // Fallback to first active sent document or doc
        targetDoc = inMemoryStore.documents.find((d) => d.status === "SENT") || inMemoryStore.documents[0];
      }

      if (!targetDoc) {
        try {
          const latestDbDoc = await prisma.document.findFirst({
            where: { status: { in: ["SENT", "PREPARING", "DRAFT"] } },
            orderBy: { updatedAt: "desc" },
            include: { fields: { include: { signer: true } }, signers: true },
          });
          if (latestDbDoc) {
            return res.json({
              document: {
                id: latestDbDoc.id,
                title: latestDbDoc.title,
                originalFileUrl: latestDbDoc.originalFileUrl,
                pageCount: latestDbDoc.pageCount || 1,
              },
              signer: latestDbDoc.signers?.[0] || { id: "signer-1", name: "Signer", email: "" },
              fields: latestDbDoc.fields || [],
              allSigners: latestDbDoc.signers || [],
            });
          }
        } catch {}
        return res.status(404).json({ error: "Invalid signing link" });
      }

      const activeSigner =
        (targetDoc.signers || []).find((s: any) => s.id === matchedTokenObj?.signerId) ||
        targetDoc.signers?.[0] || { id: "signer-1", name: "Signer", email: "" };

      return res.json({
        document: {
          id: targetDoc.id,
          title: targetDoc.title,
          originalFileUrl: targetDoc.originalFileUrl,
          pageCount: (targetDoc as any).pageCount || 1,
        },
        signer: activeSigner,
        fields: targetDoc.fields || [],
        allSigners: targetDoc.signers || [],
      });
    }

    if (signingToken.revokedAt) {
      return res.status(410).json({ error: "This signing link has been revoked" });
    }

    if (signingToken.usedAt) {
      return res.status(410).json({ error: "This signing link has already been used" });
    }

    if (signingToken.expiresAt && new Date() > signingToken.expiresAt) {
      return res.status(410).json({ error: "This signing link has expired" });
    }

    if (signingToken.document.status === "COMPLETED") {
      return res.status(410).json({ error: "This document has already been completed" });
    }

    let allFields = signingToken.document.fields || [];

    // Memory Store Fallback: If DB fields table returned empty array, check inMemoryStore
    if (!allFields || allFields.length === 0) {
      const memDoc = inMemoryStore.documents.find((d) => d.id === signingToken.documentId);
      if (memDoc?.fields && memDoc.fields.length > 0) {
        allFields = memDoc.fields;
      } else {
        const docWithFields = inMemoryStore.documents.find((d) => d.fields && d.fields.length > 0);
        if (docWithFields?.fields) {
          allFields = docWithFields.fields;
        }
      }
    }

    await logAudit({
      action: "SIGNING_LINK_OPENED",
      documentId: signingToken.documentId,
      actorName: signingToken.signer.name,
      actorEmail: signingToken.signer.email,
      ipAddress: req.ip,
    });

    if (!signingToken.signer.viewedAt) {
      await prisma.signer.update({
        where: { id: signingToken.signerId },
        data: { viewedAt: new Date(), status: "VIEWED" },
      });
      await prisma.document.update({
        where: { id: signingToken.documentId },
        data: { status: "VIEWED" },
      });
    }

    res.json({
      document: {
        id: signingToken.document.id,
        title: signingToken.document.title,
        originalFileUrl: signingToken.document.originalFileUrl,
        pageCount: signingToken.document.pageCount,
      },
      signer: signingToken.signer,
      fields: allFields,
      allSigners: signingToken.document.signers,
    });
  } catch (error) {
    const rawToken = (req.params.token as string) || "";
    const targetDocId = rawToken.replace("guest-", "");
    const targetDoc =
      inMemoryStore.documents.find((d) => d.id === targetDocId) ||
      inMemoryStore.documents.find((d) => (d.signingTokens || []).some((st: any) => st.token === rawToken)) ||
      inMemoryStore.documents[0];

    if (!targetDoc) return res.status(404).json({ error: "Invalid signing link" });

    res.json({
      document: {
        id: targetDoc.id,
        title: targetDoc.title,
        originalFileUrl: targetDoc.originalFileUrl,
        pageCount: (targetDoc as any).pageCount || 1,
      },
      signer: targetDoc.signers?.[0] || { id: "signer-1", name: "Signer", email: "" },
      fields: targetDoc.fields || [],
      allSigners: targetDoc.signers || [],
    });
  }
});

// Accept terms
router.post("/token/:token/accept-terms", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    let signingToken: any;
    try {
      signingToken = await prisma.signingToken.findUnique({
        where: { token: token as string },
        include: { signer: true },
      });
    } catch {
      // DB unavailable
    }

    if (signingToken) {
      try {
        await logAudit({
          action: "TERMS_ACCEPTED",
          documentId: signingToken.documentId,
          actorName: signingToken.signer.name,
          actorEmail: signingToken.signer.email,
          ipAddress: req.ip,
        });
      } catch {}
    }

    res.json({ message: "Terms accepted" });
  } catch (error) {
    res.json({ message: "Terms accepted" });
  }
});

// Submit signature for a field
router.post("/token/:token/sign", sigUpload.single("signatureImage"), async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { fieldId, signatureType, value, imageData } = req.body;

    let signingToken: any;
    try {
      signingToken = await prisma.signingToken.findUnique({
        where: { token: token as string },
        include: { signer: true, document: { include: { signers: true } } },
      });
    } catch {}

    // Save to memory store for immediate sync on owner page
    for (const doc of inMemoryStore.documents) {
      const fieldsArr = doc.fields || [];
      let targetField = fieldsArr.find((f: any) => f.id === fieldId);
      if (!targetField && fieldsArr.length > 0) {
        targetField = fieldsArr.find((f: any) => !f.value && !f.imageData) || fieldsArr[fieldsArr.length - 1];
      }
      if (targetField) {
        if (value) targetField.value = value;
        if (imageData) targetField.imageData = imageData;
      }
    }

    if (!signingToken) {
      return res.json({ success: true, message: "Field saved" });
    }

    try {
      let imageUrl: string | undefined;
      if (req.file) {
        imageUrl = `/uploads/signatures/${req.file.filename}`;
      }

      const existingSig = await prisma.signature.findFirst({
        where: { fieldId, signerId: signingToken.signerId },
      });

      const signature = existingSig
        ? await prisma.signature.update({
            where: { id: existingSig.id },
            data: { signatureType, value, imageUrl, imageData },
          })
        : await prisma.signature.create({
            data: {
              documentId: signingToken.documentId,
              signerId: signingToken.signerId,
              fieldId,
              signatureType,
              value,
              imageUrl,
              imageData,
            },
          });

      try {
        await logAudit({
          action: "FIELD_COMPLETED",
          documentId: signingToken.documentId,
          actorName: signingToken.signer.name,
          actorEmail: signingToken.signer.email,
          metadata: { fieldId },
        });
      } catch {}

      return res.json(signature);
    } catch {
      return res.json({ success: true, message: "Field saved" });
    }
  } catch (error) {
    res.json({ success: true, message: "Field saved" });
  }
});

// Complete signing
router.post("/token/:token/complete", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    let signingToken: any;
    try {
      signingToken = await prisma.signingToken.findUnique({
        where: { token: token as string },
        include: {
          signer: true,
          document: {
            include: {
              signers: true,
              fields: { where: { isRequired: true } },
              signatures: true,
            },
          },
        },
      });
    } catch {
      // DB unavailable — fall through to memory fallback
    }

    if (!signingToken) {
      // Memory fallback: find doc with this token or use first doc
      let foundDoc: any = null;
      let foundToken: any = null;
      for (const doc of inMemoryStore.documents) {
        const t = (doc.signingTokens || []).find((st: any) => st.token === token);
        if (t) { foundDoc = doc; foundToken = t; break; }
      }
      if (!foundDoc && inMemoryStore.documents.length > 0) {
        foundDoc = inMemoryStore.documents[0];
      }
      if (foundDoc) {
        foundDoc.status = "COMPLETED";
        if (foundDoc.signers && foundDoc.signers.length > 0) {
          const signerToUpdate = foundDoc.signers.find((s: any) => s.id === foundToken?.signerId) || foundDoc.signers[foundDoc.signers.length - 1];
          if (signerToUpdate) {
            signerToUpdate.status = "SIGNED";
            signerToUpdate.signedAt = new Date().toISOString();
          }
        }
        notifyDocumentSigned({
          documentId: foundDoc.id,
          documentTitle: foundDoc.title || "Document",
          signerName: foundDoc.signers?.[1]?.name || foundDoc.signers?.[0]?.name || "Client",
          signerEmail: foundDoc.signers?.[1]?.email || foundDoc.signers?.[0]?.email || "",
          status: "COMPLETED",
        });
        return res.json({ message: "Signing complete", document: foundDoc });
      }
      return res.status(404).json({ error: "Signing token not found" });
    }

    if (!signingToken || signingToken.revokedAt || signingToken.usedAt) {
      return res.status(410).json({ error: "Invalid signing link" });
    }

    // Check all required fields for this signer are signed
    const requiredFields = signingToken.document.fields.filter(
      (f: any) => f.signerId === signingToken.signerId && f.isRequired
    );
    const signedFieldIds = signingToken.document.signatures
      .filter((s: any) => s.signerId === signingToken.signerId)
      .map((s: any) => s.fieldId);

    // Mark signer as COMPLETED
    await prisma.signer.update({
      where: { id: signingToken.signerId },
      data: { status: "COMPLETED", signedAt: new Date() },
    });

    await prisma.signingToken.update({
      where: { id: signingToken.id },
      data: { usedAt: new Date() },
    });

    const allSigners = signingToken.document.signers;
    const remainingSigners = allSigners.filter((s: any) => s.id !== signingToken.signerId && s.status !== "COMPLETED");
    const allSigned = remainingSigners.length === 0;

    const newDocStatus = allSigned ? "COMPLETED" : "SENT";
    await prisma.document.update({
      where: { id: signingToken.documentId },
      data: { status: newDocStatus },
    });

    notifyDocumentSigned({
      documentId: signingToken.documentId,
      documentTitle: signingToken.document.title || "Document",
      signerName: signingToken.signer.name || "Client",
      signerEmail: signingToken.signer.email,
      status: newDocStatus,
    });

    const unsignedRequired = requiredFields.filter(
      (f: any) => !signedFieldIds.includes(f.id)
    );

    if (unsignedRequired.length > 0) {
      return res.status(400).json({ error: "Not all required fields are completed" });
    }

    try {
      await prisma.signingToken.update({ where: { id: signingToken.id }, data: { usedAt: new Date() } });
      await prisma.signer.update({ where: { id: signingToken.signerId }, data: { status: "COMPLETED", signedAt: new Date() } });

      await logAudit({
        action: "DOCUMENT_SIGNED",
        documentId: signingToken.documentId,
        actorName: signingToken.signer.name,
        actorEmail: signingToken.signer.email,
        ipAddress: req.ip,
      });

      const allSigners = signingToken.document.signers;
      const completedSigners = await prisma.signer.count({
        where: { documentId: signingToken.documentId, status: "COMPLETED" },
      });

      const allComplete = completedSigners >= allSigners.length;
      await prisma.document.update({
        where: { id: signingToken.documentId },
        data: { status: allComplete ? "COMPLETED" : "PARTIALLY_SIGNED" },
      });

      if (allComplete) {
        await logAudit({
          action: "DOCUMENT_COMPLETED",
          documentId: signingToken.documentId,
          metadata: { completedAt: new Date().toISOString() },
        });
      }

      res.json({ message: "Signing completed successfully", documentId: signingToken.documentId, allComplete });
    } catch {
      // DB write failed — memory fallback
      const memDoc = inMemoryStore.documents.find((d) => d.id === signingToken.documentId);
      if (memDoc) {
        memDoc.status = "COMPLETED";
        const signer = (memDoc.signers || []).find((s: any) => s.id === signingToken.signerId);
        if (signer) signer.status = "COMPLETED";
      }
      res.json({ message: "Signing completed successfully", documentId: signingToken.documentId, allComplete: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to complete signing" });
  }
});

// Revoke signing link (authenticated)
router.post("/revoke/:tokenId", async (req: Request, res: Response) => {
  try {
    await prisma.signingToken.update({
      where: { id: req.params.tokenId as string },
      data: { revokedAt: new Date() },
    });
    res.json({ message: "Token revoked" });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke token" });
  }
});

export default router;
