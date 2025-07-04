import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { StructuredLoggerService } from "./core/logger";

interface ExtendedError extends Error {
  cause?: unknown;
}

async function bootstrap(): Promise<void> {
  const l = new StructuredLoggerService();
  l.setContext("Bootstrap");

  l.startTrace();
  l.info("Starting application");

  try {
    const app = await NestFactory.create(AppModule, {
      cors: true,
      bufferLogs: true,
    });

    const loggerService = await app.resolve(StructuredLoggerService);
    app.useLogger(loggerService);

    const configService = await app.resolve(ConfigService);
    const port = configService.get<number>("PORT", 3004);

    await app.listen(port);

    l.info(`Application is running on: http://localhost:${port}`, {
      meta: { port },
    });
    l.endTrace();
  } catch (err) {
    const error = err as ExtendedError;

    l.error("Failed to start application", error, {
      meta: {
        message: error.message,
        name: error.name,
        cause: error.cause || "No cause specified",
        stack: error.stack?.split("\n").slice(0, 5).join("\n"),
      },
    });

    l.endTrace();
    process.exit(1);
  }
}

void bootstrap();
