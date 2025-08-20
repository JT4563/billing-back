import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import { config } from "./config/env.js";

export const createApp = () => {
  const app = express();

  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2000, // 2000 req/min per IP (tune as needed)
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(helmet());
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "http://localhost:3002", 
        process.env.FRONTEND_URL || "http://localhost:3000"
      ],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(compression());
  app.use(limiter);
  app.use(morgan("combined"));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", routes);

  // 404
  app.use((req, res) => res.status(404).json({ message: "Not found" }));

  // Error handler
  app.use((err, req, res, _next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ message: "Server error" });
  });

  return app;
};
