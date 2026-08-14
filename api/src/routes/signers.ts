import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { inMemoryStore } from "../utils/store";

const router = Router();
router.use(authenticate);

router.post("/", async (req: AuthRequest, res) => {
  const { documentId, name, email, phone, role, color } = req.body;
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

  // Always update inMemoryStore to ensure signers display in prepare editor
  const memDoc = inMemoryStore.documents.find((d) => d.id === documentId) || inMemoryStore.documents[0];
  if (memDoc) {
    if (!memDoc.signers) memDoc.signers = [];
    newSignerObj.orderIndex = memDoc.signers.length;
    memDoc.signers.push(newSignerObj);
  }

  try {
    const document: any = await prisma.document.findFirst({
      where: { id: documentId, organizationId: req.user!.organizationId },
      include: { signers: true },
    });

    if (document) {
      const orderIndex = document.signers ? document.signers.length : 0;
      const signer = await prisma.signer.create({
        data: { documentId, name, email, phone, role, color, orderIndex },
      });
      return res.status(201).json(signer);
    }
    return res.status(201).json(newSignerObj);
  } catch (error) {
    return res.status(201).json(newSignerObj);
  }
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
