import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { StructuredLoggerService } from "./core/logger";
import { GRPC_LISTENER_CONFIG_KEY } from "./config/grpc.config";

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

    const kafkaOptions = configService.get("kafka").getClientOptions({
      createPartitioner: require('kafkajs').Partitioners.LegacyPartitioner
    });
    
    const grpcOptions = configService.get(GRPC_LISTENER_CONFIG_KEY);
    if (!grpcOptions) {
      throw new Error('gRPC listener config is missing');
    }

    [grpcOptions, kafkaOptions].forEach(options => app.connectMicroservice(options));

    await app.startAllMicroservices();
    l.info('All microservices started successfully');
    l.info('gRPC packages loaded:', { meta: { packages: grpcOptions.options.package } });

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
