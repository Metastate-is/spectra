import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OpenTelemetryService } from "./opentelemetry.service";
import { StructuredLoggerService } from "./structured-logger.service";

/**
 * Global Logger Module
 * Provides structured logging capabilities throughout the application
 *
 * Features:
 * - JSON-formatted logs for Grafana Loki
 * - OpenTelemetry integration with trace_id
 * - Three log levels: debug, info, error
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [StructuredLoggerService, OpenTelemetryService],
  exports: [StructuredLoggerService, OpenTelemetryService],
})
export class LoggerModule {}
