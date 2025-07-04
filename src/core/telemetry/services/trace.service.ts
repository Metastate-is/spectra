import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Интерфейс трейса OpenTelemetry
 */
interface IOtelSpan {
  /**
   * Добавляет атрибуты к спану
   */
  setAttributes(attributes: Record<string, any>): IOtelSpan;

  /**
   * Добавляет событие к спану
   */
  addEvent(name: string, attributes?: Record<string, any>): IOtelSpan;

  /**
   * Устанавливает статус спана
   */
  setStatus(status: "ok" | "error", message?: string): IOtelSpan;

  /**
   * Завершает спан
   */
  end(): void;
}

/**
 * Заглушка для спана OpenTelemetry
 * Используется, когда трассировка отключена
 */
class NoopSpan implements IOtelSpan {
  setAttributes(): IOtelSpan {
    return this;
  }

  addEvent(): IOtelSpan {
    return this;
  }

  setStatus(): IOtelSpan {
    return this;
  }

  end(): void {
    // Нет действий
  }
}

/**
 * Сервис трассировки OpenTelemetry
 *
 * ВАЖНО: Сейчас это заглушка для будущего использования.
 * Трассировка отключена до готовности Tempo.
 */
@Injectable()
export class TraceService {
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>("OTEL_TRACES_ENABLED") === "true";
  }

  /**
   * Создает новый спан
   *
   * @param name Имя спана
   * @param attributes Начальные атрибуты
   * @returns Спан (или заглушка, если трассировка отключена)
   */
  startSpan(name: string, attributes?: Record<string, any>): IOtelSpan {
    // Пока трассировка отключена, возвращаем заглушку
    if (!this.enabled) {
      return new NoopSpan();
    }

    // В будущем здесь будет создание реального спана
    console.log(`[TRACE] Start span: ${name}`, attributes);
    return new NoopSpan();
  }

  /**
   * Получает текущий активный спан из контекста
   *
   * @returns Активный спан или null
   */
  getActiveSpan(): IOtelSpan | null {
    // Пока трассировка отключена, возвращаем заглушку
    if (!this.enabled) {
      return new NoopSpan();
    }

    // В будущем здесь будет получение активного спана из контекста
    return null;
  }
}
