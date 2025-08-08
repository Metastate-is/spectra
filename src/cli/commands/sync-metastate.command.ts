import { Command, CommandRunner } from "nest-commander";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { OnchainMarkTypeEnum } from "src/type";
import { cypher } from "src/utils/cypher";
import { StructuredLoggerService } from "../../core/logger";
import { ReputationContractService } from "src/modules/metastate/services/reputatoin-contract.service";

@Command({
  name: "sync-metastate",
  description: "Sync metastate to neo4j",
})
export class SyncMetaStateCommand extends CommandRunner {
  private readonly l = new StructuredLoggerService();

  constructor(private readonly neo4jService: Neo4jService, private readonly reputationContractService: ReputationContractService) {
    super();
    this.l.setContext(SyncMetaStateCommand.name);
  }

  async run(_passedParams: string[]): Promise<void> {
    this.l.startTrace();
    try {
      // Инициализируем модели
      await this.syncMetastate();
      // Вешаем индексы
    } catch (error) {
      this.l.error("[INIT ERROR] Ошибка инициализации", error as Error);
      process.exit(1);
    } finally {
      this.l.endTrace();
    }
  }

  async syncMetastate(): Promise<void> {
    try {
      const result = await this.neo4jService.runQuery(
        cypher/* cypher */`
          MATCH (from:Participant)-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant),
                (mark)-[:OF_TYPE]->(type:MarkType)
          WHERE type.name = $trustType
          RETURN 
            mark.id AS id,
            mark.value AS value,
            mark.createdAt AS createdAt,
            mark.updatedAt AS updatedAt,
            from.participantId AS fromParticipantId,
            to.participantId AS toParticipantId,
            type.name AS markType,
            type.onchain AS onchain
        `,
        { trustType: OnchainMarkTypeEnum.TRUST }
      );
      
      const marks = result.records.map(r => ({
        id: r.get('id'),
        value: r.get('value'),
        createdAt: r.get('createdAt'),
        updatedAt: r.get('updatedAt'),
        fromParticipantId: r.get('fromParticipantId'),
        toParticipantId: r.get('toParticipantId'),
        markType: r.get('markType'),
        onchain: r.get('onchain'),
      }));

      for (const mark of marks) {
        await this.reputationContractService.storeMark(
          mark.fromParticipantId,
          mark.toParticipantId,
          mark.value,
          mark.markType,
        );
      }

      console.log("[INIT] MarkTypes инициализированы");
    } catch (err) {
      console.error("[INIT ERROR] Ошибка инициализации MarkTypes", err);
      throw err;
    }
  }
}
