import { NativeConnection, Worker } from "@temporalio/worker";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { activities } from "./activities";

async function runWorker(): Promise<void> {
  const connection = await NativeConnection.connect({ address: env.temporalAddress });
  const worker = await Worker.create({
    connection,
    namespace: env.temporalNamespace,
    taskQueue: env.taskQueue,
    workflowsPath: require.resolve("./workflows"),
    activities
  });

  logger.info({ taskQueue: env.taskQueue }, "Temporal worker starting");
  await worker.run();
  await connection.close();
}

runWorker().catch((error: unknown) => {
  logger.fatal({ err: error }, "Temporal worker stopped unexpectedly");
  process.exitCode = 1;
});
