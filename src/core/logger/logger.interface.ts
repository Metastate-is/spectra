/**
 * Custom Logger Service Interface
 *
 * Only supports three log levels:
 * - debug: For detailed debugging information. Should be used for business logic tracking.
 * - info: For informational messages about business events. One log per business action.
 * - error: For unexpected errors that require immediate attention. Expected errors should NOT be logged here.
 */
export interface LoggerOptions {
  context?: string;
  traceId?: string;
  spanId?: string;
  /**
   * Additional metadata to include in the log
   */
  meta?: Record<string, any>;
}

export interface StructuredLogger {
  /**
   * Log debug message - For detailed debugging information
   * Use for business logic tracking and detailed debugging
   */
  debug(message: string, options?: LoggerOptions): void;

  /**
   * Log info message - For business events notification
   * Use for significant business events (one log per business operation)
   * E.g., Query.me executed, user created, stellar-sync started/completed
   */
  info(message: string, options?: LoggerOptions): void;

  /**
   * Log error message - For unexpected errors that require immediate attention
   * Do NOT use for expected errors that are part of normal business flow
   */
  error(message: string, error?: Error, options?: LoggerOptions): void;

  /**
   * Set trace context for a series of log messages
   * Essential for tracking operations across the system
   */
  setContext(context: string): void;

  /**
   * Generate and use a trace ID for correlating logs from the same logical operation
   */
  startTrace(): void;

  /**
   * Clear the current trace context
   */
  endTrace(): void;

  /**
   * Create a child logger with inherited context and persistent metadata
   * Child loggers maintain the same trace context as the parent
   * @param metadata Persistent metadata to include in all logs from this child
   * @param childContext Optional new context name for the child logger
   * @returns A new StructuredLogger instance with inherited properties
   */
  child(metadata: Record<string, any>, childContext?: string): StructuredLogger;
}
