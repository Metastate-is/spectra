import { registerAs } from "@nestjs/config";

/**
 * Logger and Tracing Configuration
 *
 * This configuration controls the behavior of the application's logging and tracing systems.
 * It is used by the LoggerModule and OpenTelemetryService.
 */
export default registerAs("logger", () => ({
  /**
   * Log level controls which log messages are output.
   * Possible values:
   * - 'debug': Shows all logs (debug, info, error)
   * - 'info': Shows only info and error logs
   * - 'error': Shows only error logs
   * Default: 'info' in production, 'debug' in development
   */
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),

  /**
   * Whether to format logs as pretty-printed JSON (for development) or
   * compact JSON (for production)
   */
  prettyPrint: process.env.LOG_PRETTY_PRINT === "true" || process.env.NODE_ENV !== "production",

  /**
   * OpenTelemetry tracing configuration
   */
  tracing: {
    /**
     * Whether to enable OpenTelemetry tracing
     */
    enabled: process.env.TRACING_ENABLED === "true",

    /**
     * OpenTelemetry exporter URL (for OTLP)
     */
    exporterUrl: process.env.TRACING_EXPORTER_URL || "http://localhost:4318/v1/traces",

    /**
     * Service name to use in traces
     */
    serviceName: process.env.TRACING_SERVICE_NAME || "spectra",

    /**
     * Sampling rate (between 0 and 1)
     * - 1: Sample all traces
     * - 0: Sample no traces
     */
    samplingRatio: parseFloat(process.env.TRACING_SAMPLING_RATIO || "1.0"),
  },
}));
