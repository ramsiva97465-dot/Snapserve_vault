import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { inMemoryStore } from "../utils/store";

const router = Router();
router.use(authenticate);

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { documentId, signerId, fieldType, fieldName, pageNumber, x, y, width, height, isRequired, defaultValue, placeholder, properties } = req.body;

    const document = await prisma.document.findFirst({
      where: { id: documentId, organizationId: req.user!.organizationId },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    const field = await prisma.documentField.create({
      data: { documentId, signerId, fieldType, fieldName, pageNumber, x, y, width, height, isRequired: isRequired ?? true, defaultValue, placeholder, properties },
      include: { signer: true },
    });

    res.status(201).json(field);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create field" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { signerId, fieldName, pageNumber, x, y, width, height, isRequired, defaultValue, placeholder, properties } = req.body;

    const field = await prisma.documentField.update({
      where: { id: req.params.id as string },
      data: { signerId, fieldName, pageNumber, x, y, width, height, isRequired, defaultValue, placeholder, properties },
      include: { signer: true },
    });

    res.json(field);
  } catch (error) {
    res.status(500).json({ error: "Failed to update field" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await prisma.documentField.delete({ where: { id: req.params.id as string } });
    res.json({ message: "Field deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete field" });
  }
});

router.post("/bulk-save", async (req: AuthRequest, res) => {
  const { documentId, fields } = req.body;
  const allSigned = fields && fields.length > 0 && fields.every((f: any) => f.value || f.imageData);
  const targetStatus = allSigned ? "COMPLETED" : "DRAFT";

  // ALWAYS sync to inMemoryStore so local reads in GET /documents/:id have fields!
  let memDoc = inMemoryStore.documents.find((d) => d.id === documentId);
  if (!memDoc) {
    memDoc = {
      id: documentId,
      title: "Document",
      status: targetStatus,
      ownerId: req.user!.id,
      organizationId: req.user!.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: [],
      signers: [],
    } as any;
    inMemoryStore.documents.unshift(memDoc!);
  }

  const formattedFields = (fields || []).map((f: any, i: number) => ({
    id: f.id || `field-mem-${Date.now()}-${i}`,
    documentId,
    signerId: f.signerId,
    fieldType: f.fieldType,
    fieldName: f.fieldName,
    pageNumber: f.pageNumber,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    isRequired: f.isRequired ?? true,
    defaultValue: f.defaultValue,
    placeholder: f.placeholder,
    properties: f.properties,
    value: f.value,
    imageData: f.imageData,
    createdAt: new Date().toISOString(),
  }));

  if (memDoc) {
    memDoc.status = targetStatus;
    memDoc.fields = formattedFields;
  }

  try {
    let document = await prisma.document.findFirst({
      where: { id: documentId },
    });

    if (!document) {
      try {
        document = await prisma.document.create({
          data: {
            id: documentId,
            title: memDoc?.title || "Document",
            status: targetStatus,
            ownerId: req.user!.id,
            organizationId: req.user!.organizationId,
          },
        });
      } catch {}
    }

    if (document) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: targetStatus },
      });

      await prisma.documentField.deleteMany({ where: { documentId } });
      if (fields && fields.length > 0) {
        await prisma.documentField.createMany({
          data: fields.map((f: any) => ({
            signerId: f.signerId || null,
            fieldType: f.fieldType,
            fieldName: f.fieldName,
            pageNumber: f.pageNumber,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            isRequired: f.isRequired ?? true,
            defaultValue: f.defaultValue,
            placeholder: f.placeholder,
            properties: f.properties,
            value: f.value,
            imageData: f.imageData,
            documentId,
          })),
        });
      }
    }
  } catch (error) {
    console.error("DB bulk-save error:", error);
  }

  return res.json(formattedFields);
});

export default router;
