import { TraceService } from "../services/trace.service";

/**
 * Декоратор для создания спана трассировки вокруг метода
 *
 * ВАЖНО: Сейчас это заглушка для будущего использования.
 * Трассировка отключена до готовности Tempo.
 *
 * @param spanName Имя спана (если не указано, будет использовано имя метода)
 * @example
 * ```typescript
 * @Span()
 * async getUser(id: string) { ... }
 *
 * @Span('CRITICAL_SECTION')
 * async processCriticalData() { ... }
 * ```
 */
export function Span(spanName?: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = async function (...args: any[]) {
      // Пытаемся получить TraceService из контекста
      let traceService: TraceService;
      try {
        // @ts-ignore: Предполагаем, что this может иметь traceService как свойство или инъекцию
        traceService = this.traceService;
      } catch (_e) {
        // Если сервис не найден, просто вызываем оригинальный метод
        return originalMethod.apply(this, args);
      }

      // Если не удалось получить traceService, просто вызываем оригинальный метод
      if (!traceService) {
        return originalMethod.apply(this, args);
      }

      // Создаем спан с указанным именем или именем метода
      const span = traceService.startSpan(spanName || methodName, {
        className: target.constructor.name,
        methodName,
      });

      try {
        // Выполняем оригинальный метод
        const result = await originalMethod.apply(this, args);
        // Устанавливаем успешный статус спана
        span.setStatus("ok");
        return result;
      } catch (error) {
        // В случае ошибки, устанавливаем статус ошибки и добавляем детали
        span.setStatus("error", error.message);
        span.setAttributes({
          "error.type": error.constructor.name,
          "error.message": error.message,
        });
        throw error;
      } finally {
        // Всегда завершаем спан
        span.end();
      }
    };

    return descriptor;
  };
}
