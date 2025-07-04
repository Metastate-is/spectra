import { randomUUID } from "crypto";
import { Injectable, LoggerService, OnModuleDestroy, Scope } from "@nestjs/common";
import { context, trace } from "@opentelemetry/api";
import type { LoggerOptions, StructuredLogger } from "./logger.interface";

// Типы из библиотеки pino (TypeScript не может найти их автоматически)
type PinoLogger = any;
type PinoLoggerOptions = any;

/**
 * Structured Logger Service with Pino and OpenTelemetry integration
 *
 * Features:
 * - Pino-based high-performance JSON-formatted structured logs
 * - OpenTelemetry integration with trace_id support
 * - Context tracking for operation sequences
 * - Three log levels only: debug, info, error
 * - Child loggers for persistent metadata context
 *
 * Usage:
 * - debug: For detailed debugging information and business logic tracking
 * - info: For significant business events (one per logical operation)
 * - error: For unexpected errors that require immediate attention
 * - child: For creating loggers with persistent metadata
 *
 * Note: Expected errors should NOT be logged as errors but handled in the application flow
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService, StructuredLogger, OnModuleDestroy {
  private context = "Application";
  private traceId: string | null = null;
  private spanId: string | null = null;
  private logger: PinoLogger;
  private rootLogger: PinoLogger;
  private pino: any; // Для доступа к библиотеке pino
  private persistentMetadata: Record<string, any> = {};

  constructor() {
    // Динамический импорт Pino (чтобы избежать ошибок типизации)
    this.pino = require("pino");

    // Получаем настройки логирования
    const logLevel = this.getConfigLogLevel();
    const prettyPrint = this.getPrettyPrint();
    const _serviceName = this.getServiceName();

    // Создаем базовую конфигурацию логгера - максимально простую и без дополнительных полей
    const baseLoggerOptions: PinoLoggerOptions = {
      level: logLevel,
      formatters: {
        level: (label: string) => ({ level: label }),
        log: (object: Record<string, any>) => {
          // Удаляем потенциально дублирующиеся поля
          const { hostname: _hostname, pid: _pid, ...rest } = object;
          return rest;
        },
      },
      base: null, // Отключаем автоматически добавляемые базовые поля
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    };

    if (prettyPrint) {
      // Для режима разработки используем читаемый формат
      const transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          levelFirst: true,
          ignore: "pid,hostname",
          messageFormat: "{msg}",
          translateTime: false,
        },
      };

      this.rootLogger = this.pino({
        ...baseLoggerOptions,
        transport,
      });
    } else {
      // Для продакшена используем чистый JSON
      this.rootLogger = this.pino(baseLoggerOptions);
    }

    // Устанавливаем базовый логгер с контекстом
    this.logger = this.rootLogger.child({ context: this.context });
  }

  /**
   * Метод жизненного цикла для корректного закрытия логгера и предотвращения утечки памяти
   */
  async onModuleDestroy() {
    // Если логгер поддерживает закрытие, вызываем его
    if (this.rootLogger && typeof this.rootLogger.flush === "function") {
      await this.rootLogger.flush();
    }

    // Закрываем все транспорты
    if (this.rootLogger && typeof this.rootLogger.close === "function") {
      await this.rootLogger.close();
    }
  }

  /**
   * Получить текущий уровень логирования из конфигурации
   */
  private getConfigLogLevel(): string {
    // Устанавливаем уровень логирования из переменной окружения, конфигурации или по умолчанию 'info'
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
    const configLogLevel = process.env.LOG_LEVEL?.toLowerCase(); //this.configService?.get<string>("logger.level")?.toLowerCase();

    // Проверяем, является ли значение одним из допустимых уровней
    const isValidLogLevel = (level: string | undefined): level is "debug" | "info" | "error" => {
      return level === "debug" || level === "info" || level === "error";
    };

    // Приоритет: 1) переменная окружения, 2) конфигурация, 3) умолчание 'info'
    if (isValidLogLevel(envLogLevel)) {
      return envLogLevel;
    }

    return isValidLogLevel(configLogLevel) ? configLogLevel : "info";
  }

  /**
   * Определить, нужно ли использовать форматирование для разработки
   */
  private getPrettyPrint(): boolean {
    // Четко проверяем, установлено ли значение в true, иначе используем false
    if (process.env.LOG_PRETTY_PRINT === "true") {
      return true;
    }

    // Проверяем конфигурацию
    const configPrettyPrint = process.env.LOG_PRETTY_PRINT === "true"; //this.configService?.get<boolean>("logger.prettyPrint");
    return configPrettyPrint === true;
  }

  /**
   * Получение имени сервиса для логов
   */
  private getServiceName(): string {
    return process.env.OTEL_SERVICE_NAME || process.env.LOG_SERVICE_NAME || "spectra";
  }

  /**
   * Set the logger context (usually the class or service name)
   */
  setContext(context: string): void {
    this.context = context;
    // Создаем новый дочерний логгер с явно указанным контекстом и сохраняем существующие метаданные
    this.logger = this.rootLogger.child({
      context,
      ...this.persistentMetadata,
    });
  }

  /**
   * Set the log level dynamically
   * @param level The log level to set ('debug', 'info', 'error')
   */
  setLogLevel(level: "debug" | "info" | "error"): void {
    if (this.logger.isLevelEnabled(level)) {
      return; // Уровень уже установлен
    }
    // Применяем новый уровень, сохраняя текущий контекст и метаданные
    this.logger = this.rootLogger.child(
      { context: this.context, ...this.persistentMetadata },
      { level },
    );
  }

  /**
   * Get the current log level
   * @returns The current log level
   */
  getLogLevel(): string {
    return this.logger?.level || "info";
  }

  /**
   * Start a new trace or use the existing one
   * Integrates with OpenTelemetry if available
   */
  startTrace(): void {
    // Если трассировка уже запущена, просто выходим
    if (this.traceId) {
      return;
    }

    // Пытаемся получить текущий спан из контекста OpenTelemetry
    const span = trace.getSpan(context.active());

    if (span) {
      // Если спан существует, извлекаем traceId и spanId из него
      const spanContext = span.spanContext();
      this.traceId = spanContext.traceId;
      this.spanId = spanContext.spanId;
    } else {
      // Если OpenTelemetry не используется или нет активного спана,
      // создаем уникальные идентификаторы
      this.traceId = randomUUID();
      this.spanId = randomUUID();
    }
  }

  /**
   * End the current trace
   * If the trace was linked to OpenTelemetry span, it will not end the span
   */
  endTrace(): void {
    this.traceId = null;
    this.spanId = null;
  }

  /**
   * Create a child logger with persistent metadata that will be included in all log messages
   * The child logger inherits trace context and log level from the parent logger
   *
   * @param metadata Persistent metadata to be included in all logs from this child
   * @param childContext Optional context name for the child logger (defaults to parent context)
   * @returns A new StructuredLogger instance with inherited properties
   */
  child(metadata: Record<string, any>, childContext?: string): StructuredLogger {
    // Создаем новый экземпляр логгера
    const childLogger = new StructuredLoggerService();

    // Копируем состояние трассировки из текущего логгера
    childLogger.traceId = this.traceId;
    childLogger.spanId = this.spanId;

    // Устанавливаем контекст для дочернего логгера
    const context = childContext || this.context;
    childLogger.context = context;

    // Объединяем метаданные родительского и дочернего логгеров
    childLogger.persistentMetadata = {
      ...this.persistentMetadata,
      ...metadata,
    };

    // Создаем Pino-логгер с объединенными метаданными
    childLogger.rootLogger = this.rootLogger;
    childLogger.logger = this.rootLogger.child({
      context,
      ...childLogger.persistentMetadata,
    });

    return childLogger;
  }

  /**
   * Log debug message - For detailed debugging information
   * @param message The message to log
   * @param options Optional logger options
   */
  debug(message: string, options?: LoggerOptions): void {
    this.logMessage("debug", message, undefined, options);
  }

  /**
   * Log info message - For business events notification
   * @param message The message to log
   * @param options Optional logger options
   */
  info(message: string, options?: LoggerOptions): void {
    this.logMessage("info", message, undefined, options);
  }

  /**
   * Log warning message (alias for info to maintain compatibility with NestJS LoggerService)
   * @param message The message to log
   * @param options Optional logger options
   */
  warn(message: string, options?: LoggerOptions): void {
    this.logMessage("info", `[WARN] ${message}`, undefined, options);
  }

  /**
   * Log message (alias for info to maintain compatibility with NestJS LoggerService)
   * @param message The message to log
   * @param options Optional logger options
   */
  log(message: string, options?: LoggerOptions): void {
    this.logMessage("info", message, undefined, options);
  }

  /**
   * Log verbose message (alias for debug to maintain compatibility with NestJS LoggerService)
   * @param message The message to log
   * @param options Optional logger options
   */
  verbose(message: string, options?: LoggerOptions): void {
    this.logMessage("debug", `[VERBOSE] ${message}`, undefined, options);
  }

  /**
   * Log error message - For unexpected errors
   * @param message The error message
   * @param error Optional Error object
   * @param options Optional logger options
   */
  error(message: string, error?: Error | string, options?: LoggerOptions): void {
    const errorObject = typeof error === "string" ? new Error(error) : error;
    this.logMessage("error", message, errorObject, options);
  }

  /**
   * Core logging function that formats and outputs logs using Pino
   */
  private logMessage(
    level: "debug" | "info" | "error",
    message: string,
    error?: Error,
    options?: LoggerOptions,
  ): void {
    // Создаем объект с данными для лога
    const logObject: Record<string, any> = {
      msg: message,
    };

    // Если есть метаданные
    if (options?.meta) {
      // Исключаем все потенциально дублирующиеся и служебные поля
      const {
        trace_id: _trace_id,
        span_id: _span_id,
        traceId: _traceId,
        spanId: _spanId,
        ...cleanMeta
      } = options.meta;

      // Добавляем только чистые метаданные
      Object.assign(logObject, cleanMeta);
    }

    // Добавляем поля трассировки вручную, чтобы избежать дублирования
    if (this.traceId) {
      logObject.trace_id = this.traceId;
      logObject.span_id = this.spanId;
    }

    // Если есть объект ошибки, добавляем его
    if (error) {
      logObject.error = error;
    }

    // Выбор метода логирования в зависимости от уровня
    switch (level) {
      case "debug":
        this.logger.debug(logObject);
        break;
      case "info":
        this.logger.info(logObject);
        break;
      case "error":
        this.logger.error(logObject);
        break;
    }
  }
}
