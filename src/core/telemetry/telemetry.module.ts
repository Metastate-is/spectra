import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MetricService } from "./services/metric.service";
import { TraceService } from "./services/trace.service";
import { TelemetryController } from "./telemetry.controller";

/**
 * Модуль телеметрии для интеграции OpenTelemetry с NestJS
 *
 * Предоставляет:
 * - Метрики Prometheus
 * - Трассировку (отключена до готовности Tempo)
 */
@Global()
@Module({})
export class TelemetryModule {
  static forRoot(): DynamicModule {
    return {
      module: TelemetryModule,
      imports: [ConfigModule],
      controllers: [TelemetryController],
      providers: [MetricService, TraceService],
      exports: [MetricService, TraceService],
    };
  }
}
