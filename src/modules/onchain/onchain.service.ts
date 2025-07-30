import { Injectable } from "@nestjs/common";
import { TransactionPromise } from "neo4j-driver-core";
import { IOnchainMark } from "src/core/iterface/onchain.interface";
import { KafkaService } from "src/core/kafka/kafka.service";
import {
  BaseMarkService,
  IGetReputationContextResponse,
  IGetReputationCountResponse,
} from "src/core/mark/base-marks.service";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { cypher } from "src/utils/cypher";
import { formatEventPayload } from "src/utils/kafka/format-event-created";

@Injectable()
export class OnchainService extends BaseMarkService<IOnchainMark> {
  protected readonly onchain = true;

  constructor(
    neo4jService: Neo4jService,
    private readonly kafkaService: KafkaService,
  ) {
    super(neo4jService, OnchainService.name);
  }

  async process(mark: IOnchainMark): Promise<boolean> {
    return await super.process(mark);
  }

  /**
   * Создание новой оффчейн-марк
   * @param markData
   */
  protected async create(markData: IOnchainMark, tx: TransactionPromise): Promise<IOnchainMark> {
    try {
      const queryParams = {
        fromParticipantId: markData.fromParticipantId,
        toParticipantId: markData.toParticipantId,
        markType: markData.markType,
        value: markData.value,
      };

      this.logger.log("OnchainService create", {
        meta: {
          queryParams,
        },
      });

      const query = cypher /*cypher*/`
        MATCH (from:Participant {participantId: $fromParticipantId}), (to:Participant {participantId: $toParticipantId})
        MERGE (type:MarkType {name: $markType, onchain: ${this.onchain}})
        CREATE (mark:Mark {
          id: randomUUID(),
          value: $value,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (from)-[:GAVE]->(mark)-[:ABOUT]->(to)
        CREATE (mark)-[:OF_TYPE]->(type)
        RETURN mark
      `;

      const result = await tx.run(query, queryParams);

      const record = result.records[0];
      if (!record || !record.has("mark")) {
        throw new Error("Mark not created or missing in response");
      }

      const mark = record.get("mark").properties;

      this.logger.log("OnchainService create result", {
        meta: {
          mark,
        },
      });

      return {
        ...mark,
        ...queryParams,
      };
    } catch (e) {
      this.logger.error("Error creating new mark", e);
      throw e;
    }
  }

  /**
   * Обновление существующей оффчейн-марк
   * @param markData
   */
  protected async update(markData: IOnchainMark, tx: TransactionPromise): Promise<IOnchainMark> {
    try {
      const queryParams = {
        fromParticipantId: markData.fromParticipantId,
        toParticipantId: markData.toParticipantId,
        markType: markData.markType,
        value: markData.value,
      };

      this.logger.log("OnchainService update", {
        meta: {
          queryParams,
        },
      });

      const query = cypher /*cypher*/`
        MATCH (from:Participant {participantId: $fromParticipantId})-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant {participantId: $toParticipantId}),
              (mark)-[:OF_TYPE]->(type:MarkType {name: $markType, onchain: ${this.onchain}})
        SET mark.value = $value,
            mark.updatedAt = datetime()
        RETURN mark
      `;

      const result = await tx.run(query, queryParams);

      const record = result.records[0];
      if (!record || !record.has("mark")) {
        throw new Error("Mark not updated or missing in response");
      }

      const mark = record.get("mark").properties;

      this.logger.log("OnchainService update result", {
        meta: {
          mark,
        },
      });

      return {
        ...mark,
        ...queryParams,
      };
    } catch (e) {
      this.logger.error("Error updating existing mark", e);
      throw e;
    }
  }

  protected async sendEventCreateMark(mark: IOnchainMark, e?: Error): Promise<void> {
    try {
      const payload = await formatEventPayload(mark, mark.markType, this.onchain, e);

      await this.kafkaService.sendMarkCreated(payload);

      this.logger.log("Mark created message sent successfully", {
        meta: { payload },
      });
    } catch (e) {
      this.logger.error("Error sending event", e);
    }
  }

  async getReputationContext(
    mark: Omit<IOnchainMark, "value">,
  ): Promise<IGetReputationContextResponse> {
    return await super.getReputationContext(mark as IOnchainMark);
  }

  async getReputationCount(
    mark: Omit<IOnchainMark, "value">,
  ): Promise<IGetReputationCountResponse> {
    return await super.getReputationCount(mark as IOnchainMark);
  }
}
