import { Counter, Histogram, register } from "prom-client";

/**
 * Декоратор для измерения времени выполнения метода
 *
 * @param metricName Имя метрики (если не указано, будет использовано имя класса и метода)
 * @param help Описание метрики
 * @param labelNames Имена меток
 * @param buckets Границы бакетов для гистограммы
 * @example
 * ```typescript
 * @OtelHistogram('custom_operation_duration')
 * async customOperation() { ... }
 * ```
 */
export function OtelHistogram(
  metricName?: string,
  help = "Method execution time in seconds",
  labelNames: string[] = ["class", "method"],
  buckets?: number[],
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const className = target.constructor.name;
    const methodName = propertyKey;
    const metricFullName =
      metricName || `spectra_${className.toLowerCase()}_${methodName}_duration`;

    let histogram: Histogram<string>;

    try {
      histogram = new Histogram({
        name: metricFullName,
        help,
        labelNames,
        buckets: buckets || [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      });

      register.registerMetric(histogram);
    } catch (error) {
      // Если метрика уже существует, используем существующую
      if (error.message === "A metric with the same name exists already") {
        histogram = register.getSingleMetric(metricFullName) as Histogram<string>;
      } else {
        throw error;
      }
    }

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      let result: any;

      try {
        // Вызываем оригинальный метод
        result = await originalMethod.apply(this, args);
        return result;
      } finally {
        // Фиксируем время выполнения
        const duration = (performance.now() - startTime) / 1000; // в секундах
        histogram.observe({ class: className, method: methodName }, duration);
      }
    };

    return descriptor;
  };
}

/**
 * Декоратор для подсчета вызовов метода
 *
 * @param metricName Имя метрики (если не указано, будет использовано имя класса и метода)
 * @param help Описание метрики
 * @param labelNames Имена меток
 * @example
 * ```typescript
 * @OtelMethodCounter()
 * async findAll() { ... }
 * ```
 */
export function OtelMethodCounter(
  metricName?: string,
  help = "Number of method calls",
  labelNames: string[] = ["class", "method", "status"],
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const className = target.constructor.name;
    const methodName = propertyKey;
    const metricFullName =
      metricName || `spectra_${className.toLowerCase()}_${methodName}_calls_total`;

    let counter: Counter<string>;

    try {
      counter = new Counter({
        name: metricFullName,
        help,
        labelNames,
      });

      register.registerMetric(counter);
    } catch (error) {
      // Если метрика уже существует, используем существующую
      if (error.message === "A metric with the same name exists already") {
        counter = register.getSingleMetric(metricFullName) as Counter<string>;
      } else {
        throw error;
      }
    }

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // Вызываем оригинальный метод
        const result = await originalMethod.apply(this, args);
        // Инкрементируем счетчик успешных вызовов
        counter.inc({ class: className, method: methodName, status: "success" });
        return result;
      } catch (error) {
        // Инкрементируем счетчик ошибочных вызовов
        counter.inc({ class: className, method: methodName, status: "error" });
        throw error;
      }
    };

    return descriptor;
  };
}
