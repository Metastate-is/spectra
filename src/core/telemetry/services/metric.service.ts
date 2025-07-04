import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Counter, Gauge, Histogram, register } from "prom-client";

/**
 * Сервис для работы с метриками Prometheus
 *
 * Предоставляет методы для создания и работы с метриками:
 * - createCounter - создание счетчика
 * - createGauge - создание шкалы
 * - createHistogram - создание гистограммы
 */
@Injectable()
export class MetricService {
  private readonly defaultLabels: Record<string, string>;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultLabels = {
      service: this.configService.get<string>("OTEL_SERVICE_NAME", "spectra"),
    };

    this.prefix = "spectra";
  }

  /**
   * Создает счетчик для подсчета событий
   *
   * @param name Имя метрики (без префикса)
   * @param help Описание метрики
   * @param labelNames Имена меток
   * @returns Counter
   */
  createCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    const metricName = this.getMetricName(name);
    const allLabels = [...new Set([...Object.keys(this.defaultLabels), ...labelNames])];

    try {
      const counter = new Counter({
        name: metricName,
        help,
        labelNames: allLabels,
      });

      register.registerMetric(counter);
      return counter;
    } catch (error) {
      // Если метрика уже существует, возвращаем существующую
      if (error.message === "A metric with the same name exists already") {
        const existingCounter = register.getSingleMetric(metricName) as Counter<string>;
        return existingCounter;
      }

      throw error;
    }
  }

  /**
   * Создает шкалу для отслеживания значений, которые могут увеличиваться и уменьшаться
   *
   * @param name Имя метрики (без префикса)
   * @param help Описание метрики
   * @param labelNames Имена меток
   * @returns Gauge
   */
  createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    const metricName = this.getMetricName(name);
    const allLabels = [...new Set([...Object.keys(this.defaultLabels), ...labelNames])];

    try {
      const gauge = new Gauge({
        name: metricName,
        help,
        labelNames: allLabels,
      });

      register.registerMetric(gauge);
      return gauge;
    } catch (error) {
      // Если метрика уже существует, возвращаем существующую
      if (error.message === "A metric with the same name exists already") {
        const existingGauge = register.getSingleMetric(metricName) as Gauge<string>;
        return existingGauge;
      }

      throw error;
    }
  }

  /**
   * Создает гистограмму для измерения распределения значений
   *
   * @param name Имя метрики (без префикса)
   * @param help Описание метрики
   * @param labelNames Имена меток
   * @param buckets Границы бакетов для гистограммы
   * @returns Histogram
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[],
  ): Histogram<string> {
    const metricName = this.getMetricName(name);
    const allLabels = [...new Set([...Object.keys(this.defaultLabels), ...labelNames])];

    try {
      const histogram = new Histogram({
        name: metricName,
        help,
        labelNames: allLabels,
        buckets: buckets || [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      });

      register.registerMetric(histogram);
      return histogram;
    } catch (error) {
      // Если метрика уже существует, возвращаем существующую
      if (error.message === "A metric with the same name exists already") {
        const existingHistogram = register.getSingleMetric(metricName) as Histogram<string>;
        return existingHistogram;
      }

      throw error;
    }
  }

  /**
   * Формирует имя метрики с префиксом
   *
   * @param name Имя метрики
   * @returns Имя метрики с префиксом
   */
  private getMetricName(name: string): string {
    // Если имя уже содержит префикс, не добавляем его снова
    if (name.startsWith(`${this.prefix}_`)) {
      return name;
    }

    return `${this.prefix}_${name}`;
  }
}
