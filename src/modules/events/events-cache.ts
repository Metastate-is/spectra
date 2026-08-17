import { Metadata } from "@metastate-is/proto-models/generated/metastate/common/v1/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Cache } from "cache-manager";

const INTERNAL_EVENT_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EventsCache {
  private readonly logger = new Logger(EventsCache.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Проверка наличия eventId в кэше
   * @param metadata метаданные события
   * @returns true, если событие уже было обработано
   */
  async checkAndSetEventId(metadata: Metadata): Promise<boolean> {
    try {
      // Если eventId отсутствует, пропускаем обработку
      if (!metadata?.eventId) {
        this.logger.warn("Event without eventId received, skipping");
        return false;
      }

      const eventId = metadata.eventId;
      const exists = await this.cache.get(eventId);

      if (exists) {
        this.logger.log(`Event with id ${eventId} already processed, skipping`);
        return true;
      }

      await this.cache.set(eventId, true, INTERNAL_EVENT_TTL_MS);
      return false;
    } catch (error) {
      this.logger.error("Error in EventsCache", error);
      throw new ServiceUnavailableException("Event idempotency cache is unavailable");
    }
  }

  async forgetEventId(metadata: Metadata): Promise<void> {
    if (metadata.eventId) {
      await this.cache.del(metadata.eventId);
    }
  }
}
