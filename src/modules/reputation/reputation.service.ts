import {
  GetReputationContextRequest,
  GetReputationContextResponse,
} from "@metastate-is/proto-models/generated/metastate/grpc/spectra/v1/reputation_context";
import {
  GetReputationCountRequest,
  GetReputationCountResponse,
} from "@metastate-is/proto-models/generated/metastate/grpc/spectra/v1/reputation_count";
import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { StructuredLoggerService } from "src/core/logger";
import { IGetReputationContextResponse } from "src/core/mark/base-marks.service";
import { OffchainMarkTypeMap, OnchainMarkTypeMap } from "src/type";
import { isBoolean } from "src/utils/boolean";
import { isValidOffchainMarkType, isValidOnchainMarkType } from "src/utils/validations";
import { OffchainService } from "../offchain/offchain.service";
import { OnchainService } from "../onchain/onchain.service";
import { GetReputationChangelogRequest, GetReputationChangelogResponse } from "@metastate-is/proto-models/generated/metastate/grpc/spectra/v1/reputation_changelog";

@Controller()
export class ReputationController {
  private readonly l = new StructuredLoggerService();

  constructor(
    private readonly onchainService: OnchainService,
    private readonly offchainService: OffchainService,
  ) {
    this.l.setContext(ReputationController.name);
  }

  @GrpcMethod("ReputationService", "GetReputationContext")
  async getReputationContext(
    data: GetReputationContextRequest,
  ): Promise<GetReputationContextResponse> {
    this.l.startTrace();
    try {
      this.l.info("GetReputationContext", { meta: { data } });
      console.log("TData: ", data);

      if (!data.fromParticipantId || !data.toParticipantId) {
        this.l.warn("Unknown participant id", { meta: { data } });
        throw new Error("Unknown participant id");
      }

      if (data.isOnchain) {
        // @TODO: Валидацию можно вынести в middleware - дублируется в нескольких местах
        if (data.onchainMarkType && !isValidOnchainMarkType(data.onchainMarkType)) {
          this.l.warn("Unknown onchain mark type", { meta: { data } });
          throw new Error("Unknown onchain mark type");
        }

        this.l.log("Processing onchain reputation context", {
          meta: {
            data,
          },
        });

        const result = await this.onchainService.getReputationContext({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: OnchainMarkTypeMap[data.onchainMarkType as keyof typeof OnchainMarkTypeMap]!,
        });

        this.l.log("Reputation context onchain result", {
          meta: {
            result,
          },
        });

        return this.formatReputationContextResponse(result);
      }

      if (data.offchainMarkType && !isValidOffchainMarkType(data.offchainMarkType)) {
        this.l.warn("Unknown offchain mark type", { meta: { data } });
        throw new Error("Unknown offchain mark type");
      }

      this.l.log("Processing offchain reputation context", {
        meta: {
          data,
        },
      });

      const result = await this.offchainService.getReputationContext({
        fromParticipantId: data.fromParticipantId,
        toParticipantId: data.toParticipantId,
        markType: OffchainMarkTypeMap[data.offchainMarkType as keyof typeof OffchainMarkTypeMap]!,
      });

      this.l.log("Reputation context offchain result", {
        meta: {
          result,
        },
      });

      return this.formatReputationContextResponse(result);
    } catch (e) {
      console.log(e);
      this.l.error("GetReputationContext", e as Error);
      throw e;
    } finally {
      this.l.debug("Finished processing reputation context", { meta: { data } });
      this.l.endTrace();
    }
  }

  @GrpcMethod("ReputationCountService", "GetReputationCount")
  async getReputationCount(data: GetReputationCountRequest): Promise<GetReputationCountResponse> {
    this.l.startTrace();

    try {
      this.l.info("GetReputationCount", { meta: { data } });

      if (!data.fromParticipantId || !data.toParticipantId) {
        this.l.warn("Unknown participant id", { meta: { data } });
        throw new Error("Unknown participant id");
      }

      if (data.isOnchain) {
        // @TODO: Валидацию можно вынести в middleware - дублируется в нескольких местах
        if (data.onchainMarkType && !isValidOnchainMarkType(data.onchainMarkType)) {
          this.l.warn("Unknown onchain mark type", { meta: { data } });
          throw new Error("Unknown onchain mark type");
        }

        this.l.log("Processing onchain reputation count", {
          meta: {
            data,
          },
        });

        const result = await this.onchainService.getReputationCount({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: OnchainMarkTypeMap[data.onchainMarkType as keyof typeof OnchainMarkTypeMap]!,
        });

        this.l.log("Reputation count onchain result", {
          meta: {
            result,
          },
        });

        return {
          positiveCount: result.positive,
          negativeCount: result.negative,
          commonCount: result.commonCount,
        };
      }

      if (data.offchainMarkType && !isValidOffchainMarkType(data.offchainMarkType)) {
        this.l.warn("Unknown offchain mark type", { meta: { data } });
        throw new Error("Unknown offchain mark type");
      }

      this.l.log("Processing offchain reputation count", {
        meta: {
          data,
        },
      });

      const result = await this.offchainService.getReputationCount({
        fromParticipantId: data.fromParticipantId,
        toParticipantId: data.toParticipantId,
        markType: OffchainMarkTypeMap[data.offchainMarkType as keyof typeof OffchainMarkTypeMap]!,
      });

      this.l.log("Reputation count offchain result", {
        meta: {
          result,
        },
      });

      return {
        positiveCount: result.positive,
        negativeCount: result.negative,
        commonCount: result.commonCount,
      };
    } catch (e) {
      this.l.error("GetReputationCount", e as Error);
      throw e;
    } finally {
      this.l.debug("Finished processing reputation count", { meta: { data } });
      this.l.endTrace();
    }
  }

  @GrpcMethod("ReputationChangelogService", "GetReputationChangelog")
  async getReputationChangelog(data: GetReputationChangelogRequest): Promise<GetReputationChangelogResponse> {
    this.l.startTrace();

    try {
      this.l.info("GetReputationChangelog", { meta: { data } });

      if (!data.fromParticipantId || !data.toParticipantId) {
        this.l.warn("Unknown participant id", { meta: { data } });
        throw new Error("Unknown participant id");
      }

      if (data.isOnchain) {
        if (data.onchainMarkType && !isValidOnchainMarkType(data.onchainMarkType)) {
          this.l.warn("Unknown onchain mark type", { meta: { data } });
          throw new Error("Unknown onchain mark type");
        }

        this.l.log("Processing onchain reputation changelog", {
          meta: {
            data,
          },
        });

        const result = await this.onchainService.getReputationChangelog({
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
          markType: OnchainMarkTypeMap[data.onchainMarkType as keyof typeof OnchainMarkTypeMap]!,
        });

        this.l.log("Reputation changelog onchain result", {
          meta: {
            result,
          },
        });

        return {
          changes: result,
        };
      }

      if (data.offchainMarkType && !isValidOffchainMarkType(data.offchainMarkType)) {
        this.l.warn("Unknown offchain mark type", { meta: { data } });
        throw new Error("Unknown offchain mark type");
      }

      this.l.log("Processing offchain reputation changelog", {
        meta: {
          data,
        },
      });

      const result = await this.offchainService.getReputationChangelog({
        fromParticipantId: data.fromParticipantId,
        toParticipantId: data.toParticipantId,
        markType: OffchainMarkTypeMap[data.offchainMarkType as keyof typeof OffchainMarkTypeMap]!,
      });

      this.l.log("Reputation changelog offchain result", {
        meta: {
          result,
        },
      });

      return {
        changes: result,
      };
    } catch (e) {
      this.l.error("GetReputationChangelog", e as Error);
      throw e;
    } finally {
      this.l.debug("Finished processing reputation changelog", { meta: { data } });
      this.l.endTrace();
    }
  }

  private formatReputationContextResponse(
    response: IGetReputationContextResponse,
  ): GetReputationContextResponse {
    return {
      fromTo: isBoolean(response.fromTo)
        ? {
            value: response.fromTo,
          }
        : undefined,
      toToFrom: isBoolean(response.toToFrom)
        ? {
            value: response.toToFrom,
          }
        : undefined,
      commonParticipants: response.commonParticipants.map((participant) => ({
        intermediateId: participant.intermediateId,
        intermediateToFrom: isBoolean(participant.intermediateToFrom)
          ? {
              value: participant.intermediateToFrom,
            }
          : undefined,
        fromToIntermediate: isBoolean(participant.fromToIntermediate)
          ? {
              value: participant.fromToIntermediate,
            }
          : undefined,
        intermediateToTo: isBoolean(participant.intermediateToTo)
          ? {
              value: participant.intermediateToTo,
            }
          : undefined,
        toToIntermediate: isBoolean(participant.toToIntermediate)
          ? {
              value: participant.toToIntermediate,
            }
          : undefined,
      })),
    };
  }
}
