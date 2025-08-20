import { Router } from "express";
import authRoutes from "./authRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const router = Router();

router.get("/health", (_req, res) =>
  res.json({ ok: true, timestamp: new Date().toISOString() })
);

router.use("/auth", authRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
