import { Controller, Get, Header, Res } from "@nestjs/common";
import { Response } from "express";
import { register } from "prom-client";

/**
 * Контроллер телеметрии для обслуживания метрик Prometheus
 *
 * Экспортирует метрики в формате Prometheus по пути /metrics
 */
@Controller()
export class TelemetryController {
  /**
   * Эндпоинт Prometheus метрик
   * Возвращает метрики в формате Prometheus от prom-client
   */
  @Get("metrics")
  @Header("Content-Type", "text/plain")
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      // Получаем метрики из глобального реестра prom-client
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).send(`Error fetching metrics: ${error.message}`);
    }
  }
}
