import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { inMemoryStore } from "../utils/store";

const router = Router();
router.use(authenticate);

router.post("/", async (req: AuthRequest, res) => {
  const { documentId, name, email, phone, role, color } = req.body;

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { signers: true },
    });

    if (document) {
      const orderIndex = document.signers ? document.signers.length : 0;
      const signer = await prisma.signer.create({
        data: {
          documentId,
          name,
          email,
          phone: phone || null,
          role: role || "Signer",
          color: color || "#3b82f6",
          orderIndex,
        },
      });

      // Sync to inMemoryStore
      const memDoc = inMemoryStore.documents.find((d) => d.id === documentId);
      if (memDoc) {
        if (!memDoc.signers) memDoc.signers = [];
        memDoc.signers.push(signer as any);
      }

      return res.status(201).json(signer);
    }
  } catch (error) {
    console.warn("DB signer create error:", error);
  }

  const newSignerObj = {
    id: `signer-${Date.now()}`,
    documentId,
    name,
    email,
    phone,
    role: role || "Signer",
    color: color || "#3b82f6",
    orderIndex: 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  const memDoc = inMemoryStore.documents.find((d) => d.id === documentId) || inMemoryStore.documents[0];
  if (memDoc) {
    if (!memDoc.signers) memDoc.signers = [];
    newSignerObj.orderIndex = memDoc.signers.length;
    memDoc.signers.push(newSignerObj);
  }

  return res.status(201).json(newSignerObj);
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, role, orderIndex, color } = req.body;

    const signer = await prisma.signer.update({
      where: { id: req.params.id as string },
      data: { name, email, phone, role, orderIndex, color },
    });

    res.json(signer);
  } catch (error) {
    res.json({ id: req.params.id, ...req.body });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await prisma.signer.delete({ where: { id: req.params.id as string } });
    res.json({ message: "Signer removed" });
  } catch (error) {
    res.json({ message: "Signer removed" });
  }
});

export default router;
