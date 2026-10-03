import express, { type ErrorRequestHandler } from "express";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { healthRouter } from "./routes/health";
import { hotelsRouter } from "./routes/hotels";
import { supplierRouter } from "./routes/suppliers";

async function startServer(): Promise<void> {
  const app = express();
  app.use(pinoHttp({ logger }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(supplierRouter);
  app.use("/api", hotelsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    logger.error({ err: error }, "Request failed");
    let cause: unknown = error;
    while (cause instanceof Error) {
      if (cause.message.includes("Both hotel suppliers are unavailable")) {
        res.status(503).json({ error: "Both hotel suppliers are unavailable" });
        return;
      }
      cause = cause.cause;
    }
    if (!(error instanceof Error)) {
      logger.error({ error }, "Request failed with a non-Error value");
    }
    if (res.headersSent) {
      next(error);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port }, "Hotel offer API listening");
  });

  const shutdown = async (): Promise<void> => {
    server.close();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

startServer().catch((error: unknown) => {
  logger.fatal({ err: error }, "Could not start API server");
  process.exitCode = 1;
});
