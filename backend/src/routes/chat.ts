import { Router } from "express";
import type { TenantRequest } from "../middleware/tenant.js";
import { answerChat } from "../services/chat.js";

const router = Router();

router.post("/", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (!message.trim()) return res.status(400).json({ error: "Type a message." });
  try {
    res.json(await answerChat(businessId, message));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Chat failed" });
  }
});

export default router;
