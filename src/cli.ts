import { LogLevel } from "@nestjs/common";
import { CommandFactory } from "nest-commander";
import { CliModule } from "./cli/cli.module";

async function bootstrap(): Promise<void> {
  // Настраиваем уровень логирования
  const logLevels: LogLevel[] = ["error", "warn", "log"];

  await CommandFactory.run(CliModule, {
    logger: logLevels,
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
