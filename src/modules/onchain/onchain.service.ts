import { Injectable } from "@nestjs/common";
import { TransactionPromise } from "neo4j-driver-core";
import { BaseMarkService } from "src/core/mark/base-makrs.service";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { IOnchainMark } from "src/core/iterface/onchain.interface";

@Injectable()
export class OnchainService extends BaseMarkService<IOnchainMark> {
  protected readonly onchain = true;

  constructor(neo4jService: Neo4jService) {
    super(neo4jService, OnchainService.name);
  }

  async process(mark: IOnchainMark): Promise<boolean> {
    return await super.process(mark);
  }

  /**
   * Создание новой оффчейн-марк
   * @param markData
   */
  protected async create(markData: IOnchainMark, tx: TransactionPromise): Promise<void> {
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
  protected async update(markData: IOnchainMark, tx: TransactionPromise): Promise<void> {
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
