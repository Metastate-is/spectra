import { Injectable } from "@nestjs/common";
import { TransactionPromise } from "neo4j-driver-core";
import { IOffchainMark } from "src/core/iterface/offchain.interface";
import { BaseMarkService } from "src/core/mark/base-makrs.service";
import { Neo4jService } from "src/core/neo4j/neo4j.service";

@Injectable()
export class OffchainService extends BaseMarkService<IOffchainMark> {
  protected readonly onchain = false;

  constructor(neo4jService: Neo4jService) {
    super(neo4jService, OffchainService.name);
  }

  async process(mark: IOffchainMark): Promise<boolean> {
    return await super.process(mark);
  }

  /**
   * Создание новой оффчейн-марк
   * @param markData
   */
  protected async create(markData: IOffchainMark, tx: TransactionPromise): Promise<void> {
    try {
      const queryParams = {
        fromParticipantId: markData.fromParticipantId,
        toParticipantId: markData.toParticipantId,
        markType: markData.markType,
        value: markData.value,
      };

      const query = /*cypher*/ `
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
      `;

      await tx.run(query, queryParams);
    } catch (e) {
      this.logger.error("Error creating new mark", e);
      throw e;
    }
  }

  /**
   * Обновление существующей оффчейн-марк
   * @param markData
   */
  protected async update(markData: IOffchainMark, tx: TransactionPromise): Promise<void> {
    try {
      const queryParams = {
        fromParticipantId: markData.fromParticipantId,
        toParticipantId: markData.toParticipantId,
        markType: markData.markType,
        value: markData.value,
      };

      const query = /*cypher*/ `
        MATCH (from:Participant {participantId: $fromParticipantId})-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant {participantId: $toParticipantId}),
              (mark)-[:OF_TYPE]->(type:MarkType {name: $markType, onchain: ${this.onchain}})
        SET mark.value = $value,
            mark.updatedAt = datetime()
      `;

      await tx.run(query, queryParams);
    } catch (e) {
      this.logger.error("Error updating existing mark", e);
      throw e;
    }
  }
}
