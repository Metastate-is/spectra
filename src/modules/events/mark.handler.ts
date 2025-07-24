import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MarkRequest } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_request";
import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { StructuredLoggerService } from "src/core/logger";
import { OffchainMarkTypeMap, OnchainMarkTypeMap } from "src/type";
import { isValidOffchainMarkType, isValidOnchainMarkType } from "src/utils/validations";
import { OffchainService } from "../offchain/offchain.service";
import { OnchainService } from "../onchain/onchain.service";
import { EventsCache } from "./events-cache";

@Controller()
export class MarkHandler {
  private readonly logger = new StructuredLoggerService();

  constructor(
    private readonly eventsCache: EventsCache,
    private readonly onchainService: OnchainService,
    private readonly offchainService: OffchainService,
  ) {
    this.logger.setContext(MarkHandler.name);
  }

  @MessagePattern(KAFKA_TOPICS.SPECTRA.MARK.REQUEST)
  async handleMarkRequestEvent(data: MarkRequest) {
    console.log("handleMarkRequestEvent", data);
    // Инициализируем трассировку для этого запроса
    // traceId нужен только для инициализации, но не для логов (будет добавлен через mixin)
    this.logger.startTrace();
    this.logger.log("Handle mark request event", {
      meta: {
        data,
      },
    });

    try {
      // Получаем дату и записываем ее в Кэш
      // если запись уже есть - игнорируем ее
      if (data.metadata) {
        const exist = await this.eventsCache.checkAndSetEventId(data.metadata);
        if (exist) return;
      }

      this.logger.log("Processing mark request event", {
        meta: {
          data,
        },
      });
      const fromParticipantId = data.fromParticipantId;
      const toParticipantId = data.toParticipantId;

      if (!fromParticipantId || !toParticipantId) {
        this.logger.warn("Unknown participant id", {
          meta: {
            data,
          },
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
      this.logger.error("Error processing mark request event", error as Error);
    } finally {
      this.logger.endTrace();
    }
  }

  async processMark(data: MarkRequest): Promise<boolean | undefined> {
    try {
      this.logger.log("Processing mark event", {
        meta: {
          data,
        },
      });

      if (data.isOnchain) {
        if (data.onchainMarkType && !isValidOnchainMarkType(data.onchainMarkType)) {
          return this.logMarkTypeError("onchain", data);
        }

        this.logger.log("Processing onchain mark event", {
          meta: {
            data,
          },
        });

        const result = await this.onchainService.process({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: OnchainMarkTypeMap[data.onchainMarkType as keyof typeof OnchainMarkTypeMap]!,
          value: data.value,
        });

        if (!result) {
          this.logger.debug("Error processing onchain mark", { meta: { data } });
        }
      } else {
        if (data.offchainMarkType && !isValidOffchainMarkType(data.offchainMarkType)) {
          return this.logMarkTypeError("offchain", data);
        }

        this.logger.log("Processing offchain mark event", {
          meta: {
            data,
          },
        });

        const result = await this.offchainService.process({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: OffchainMarkTypeMap[data.offchainMarkType as keyof typeof OffchainMarkTypeMap]!,
          value: data.value,
        });

        if (!result) {
          this.logger.debug("Error processing request offchain mark", { meta: { data } });
        }
      }
    } catch (e) {
      this.logger.error("Error processing mark event", e as Error);
      throw new Error(e);
    }
  }

  private logMarkTypeError(type: "onchain" | "offchain", data: MarkRequest): boolean {
    this.logger.warn(`Unknown ${type} mark type`, { meta: { data } });

    return false;
  }
}
