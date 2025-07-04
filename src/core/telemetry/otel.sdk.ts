import { ConfigService } from "@nestjs/config";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { HostMetrics } from "@opentelemetry/host-metrics";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { NodeSDK } from "@opentelemetry/sdk-node";

/**
 * Создает и настраивает экземпляр OpenTelemetry SDK
 */
export function createOtelSDK(configService: ConfigService): NodeSDK {
  const isEnabled = configService.get<string>("OTEL_ENABLED") === "true";

  if (!isEnabled) {
    // Если телеметрия отключена, возвращаем пустой SDK
    return new NodeSDK({});
  }

  const isMetricsEnabled = configService.get<string>("OTEL_METRICS_ENABLED") === "true";
  const serviceName = configService.get<string>("OTEL_SERVICE_NAME", "spectra");
  const metricsPort = parseInt(configService.get<string>("OTEL_METRICS_PORT", "3000"), 10);
  const metricsPath = configService.get<string>("OTEL_METRICS_PATH", "/metrics");

  // Настройка экспортера для Prometheus метрик
  const metricReader = isMetricsEnabled
    ? new PrometheusExporter({
        port: metricsPort,
        endpoint: metricsPath,
        // Установить preventServerStart: true,
        // чтобы предотвратить запуск отдельного сервера для метрик
        preventServerStart: true,
      })
    : undefined;

  // Создаем метрику хоста, если она включена
  if (isMetricsEnabled) {
    const hostMetrics = new HostMetrics();
    hostMetrics.start();
  }

  // Настраиваем автоинструментацию
  const instrumentations: Instrumentation[] = [
    ...getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Отключаем FS инструментацию, так как она создает много шума
      },
      "@opentelemetry/instrumentation-http": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-nestjs-core": {
        enabled: true,
      },
    }),
  ];

  // Создаем и настраиваем SDK
  return new NodeSDK({
    serviceName,
    metricReader,
    instrumentations,
    // Трассировка временно отключена до готовности Tempo
    traceExporter: undefined,
  });
}

// Экспортируем по умолчанию функцию, а не экземпляр SDK,
// чтобы SDK был создан после инициализации ConfigService
export default createOtelSDK;
