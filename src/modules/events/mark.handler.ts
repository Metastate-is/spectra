import { MarkRequest } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_request";
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { InternalApiGuard } from "src/core/internal-http/internal-api.guard";
import { StructuredLoggerService } from "src/core/logger";
import { OffchainMarkTypeMap, OnchainMarkTypeMap } from "src/type";
import { isValidOffchainMarkType, isValidOnchainMarkType } from "src/utils/validations";
import { OffchainService } from "../offchain/offchain.service";
import { OnchainService } from "../onchain/onchain.service";
import { EventsCache } from "./events-cache";

export interface MarkRequestResult {
  duplicate?: boolean;
  processed: boolean;
}

@Controller("internal/marks")
@UseGuards(InternalApiGuard)
export class MarkHandler {
  private readonly logger = new StructuredLoggerService();

  constructor(
    private readonly eventsCache: EventsCache,
    private readonly onchainService: OnchainService,
    private readonly offchainService: OffchainService,
  ) {
    this.logger.setContext(MarkHandler.name);
  }

  @Post()
  @HttpCode(200)
  async handleMarkRequestEvent(@Body() data: MarkRequest): Promise<MarkRequestResult> {
    // Инициализируем трассировку для этого запроса
    // traceId нужен только для инициализации, но не для логов (будет добавлен через mixin)
    this.logger.startTrace();
    this.logger.log("Handle mark request event", {
      meta: {
        data,
      },
    });

    let eventClaimed = false;
    try {
      if (!data.metadata?.eventId) {
        throw new BadRequestException("metadata.eventId is required");
      }

      const exists = await this.eventsCache.checkAndSetEventId(data.metadata);
      if (exists) return { duplicate: true, processed: true };
      eventClaimed = true;

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
        throw new BadRequestException("Participant IDs are required");
      }

      if (typeof data.value !== "boolean") {
        this.logger.warn("Invalid mark value", { meta: { data } });
        throw new BadRequestException("Mark value must be boolean");
      }

      // Находим тип марки по полю is_onchain
      // чтобы определить какой enum использовать для получения события

      const processed = await this.processMark(data);
      if (!processed) {
        throw new InternalServerErrorException("Mark was not processed");
      }
      return { processed: true };
    } catch (error) {
      this.logger.error("Error processing mark request event", error as Error);
      if (eventClaimed && data.metadata) {
        await this.eventsCache.forgetEventId(data.metadata);
      }
      throw error;
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
        const onchainMarkType = data.onchainMarkType;
        if (typeof onchainMarkType !== "number" || !isValidOnchainMarkType(onchainMarkType)) {
          this.logMarkTypeError("onchain", data);
          throw new BadRequestException("Unknown onchain mark type");
        }

        this.logger.log("Processing onchain mark event", {
          meta: {
            data,
          },
        });

        const result = await this.onchainService.process({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: OnchainMarkTypeMap[onchainMarkType]!,
          value: data.value,
        });

        if (!result) {
          this.logger.debug("Error processing onchain mark", { meta: { data } });
        }
        return result;
      }

      const offchainMarkType = data.offchainMarkType;
      if (typeof offchainMarkType !== "number" || !isValidOffchainMarkType(offchainMarkType)) {
        this.logMarkTypeError("offchain", data);
        throw new BadRequestException("Unknown offchain mark type");
      }

      this.logger.log("Processing offchain mark event", {
        meta: {
          data,
        },
      });

      const result = await this.offchainService.process({
        fromParticipantId: data.fromParticipantId,
        toParticipantId: data.toParticipantId,
        markType: OffchainMarkTypeMap[offchainMarkType]!,
        value: data.value,
      });

      if (!result) {
        this.logger.debug("Error processing request offchain mark", { meta: { data } });
      }
      return result;
    } catch (e) {
      this.logger.error("Error processing mark event", e as Error);
      throw e;
    }
  }

  private logMarkTypeError(type: "onchain" | "offchain", data: MarkRequest): void {
    this.logger.warn(`Unknown ${type} mark type`, { meta: { data } });
  }
}
