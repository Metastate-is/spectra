import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cache } from "cache-manager";
import { Metadata } from "@metastate-is/proto-models/generated/metastate/common/v1/common";

@Injectable()
export class EventsCache {
  private readonly logger = new Logger(EventsCache.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Проверка наличия eventId в кэше
   * @param metadata метаданные события
   * @returns false если eventId отсутствует или событие уже небыло обработано, иначе ture
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

      await this.cache.set(eventId, true, 8640);
      return false;
    } catch (error) {
      this.logger.error("Error in EventsCache", error);
      return false;
    }
  }
}
