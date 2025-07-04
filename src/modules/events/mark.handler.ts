import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MessagePattern } from "@nestjs/microservices";
import { EventsCache } from "./events-cache";
import { MarkCreate } from "@metastate-is/proto-models/generated/metastate/kafka/citadel/v1/mark_create";
import { OnchainService } from "../onchain/onchain.service";
import { OffchainService } from "../offchain/offchain.service";
import { StructuredLoggerService } from "src/core/logger";
import { isValidOffchainMarkType, isValidOnchainMarkType } from "src/urils/validations";

export class MarkHandler {
  private readonly logger = new StructuredLoggerService();

  constructor(
    private readonly eventsCache: EventsCache,
    private readonly onchainService: OnchainService,
    private readonly offchainService: OffchainService,
  ) {
    this.logger.setContext(MarkHandler.name);
  }

  @MessagePattern(KAFKA_TOPICS.CITADEL.MARK.CREATED)
  async handleMarkCreateEvent(data: MarkCreate) {
    // Инициализируем трассировку для этого запроса
    // traceId нужен только для инициализации, но не для логов (будет добавлен через mixin)
    this.logger.startTrace();

    try {
      // Получаем дату и записываем ее в Кэш
      // если запись уже есть - игнорируем ее
      if (data.metadata) {
        const exist = await this.eventsCache.checkAndSetEventId(data.metadata);
        if (exist) return;
      }

      this.logger.log(`Processing mark create event for mark`, {
        meta: {
          data
        }
      });
      const fromParticipantId = data.fromParticipantId;
      const toParticipantId = data.toParticipantId;

      if (!fromParticipantId || !toParticipantId) {
        this.logger.warn("Unknown participant id", {
          meta: {
            data
          }
        });
        return;
      }

      if (typeof data.value !== "boolean") {
        this.logger.warn("Invalid mark value", { meta: { data } });
        return;
      }

      // Находим тип марки по полю is_onchain 
      // чтобы определить какой enum использовать для получения события

      await this.processMark(data);

    } catch (error) {
      this.logger.error("Error processing mark create event", error);
    } finally {
      this.logger.endTrace();
    }
  }

  async processMark(
    data: MarkCreate
  ): Promise<boolean | void> {
    try {
      if (data.isOnchain) {
        if (!isValidOnchainMarkType(data.onchainMarkType)) {
          return this.logMarkTypeError("onchain", data);
        }
    
        const result = await this.onchainService.process({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: data.onchainMarkType,
          value: data.value
        });
    
        if (!result) {
          this.logger.debug("Error processing create onchain mark", { meta: { data } });
        }
    
      } else {
        if (!isValidOffchainMarkType(data.offchainMarkType)) {
          return this.logMarkTypeError("offchain", data);
        }
    
        const result = await this.offchainService.process({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: data.offchainMarkType,
          value: data.value
        });
    
        if (!result) {
          this.logger.debug("Error processing create offchain mark", { meta: { data } });
        }
      }
    } catch (e) {
      throw e;
    }
  }

  private logMarkTypeError(type: "onchain" | "offchain", data: MarkCreate) {
    this.logger.warn(`Unknown ${type} mark type`, { meta: { data } });
  }
}
