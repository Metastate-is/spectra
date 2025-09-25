import { Command, CommandRunner } from "nest-commander";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { OffchainMarkTypeEnum, OnchainMarkTypeEnum } from "src/type";
import { cypher } from "src/utils/cypher";
import { StructuredLoggerService } from "../../core/logger";

@Command({
  name: "init-neo4j",
  description: "Initialize the neo4j database",
})
export class InitNeo4jCommand extends CommandRunner {
  private readonly logger = new StructuredLoggerService();

  constructor(private readonly neo4jService: Neo4jService) {
    super();
    this.logger.setContext(InitNeo4jCommand.name);
  }

  async run(): Promise<void> {
    this.logger.startTrace();
    try {
      await this.initializeMarkTypes();
      this.logger.log("[INIT] Neo4j инициализирован");
    } catch (error) {
      this.logger.error("[INIT ERROR] Ошибка инициализации", error as Error);
      process.exit(1);
    } finally {
      this.logger.endTrace();
    }
  }

  private async initializeMarkTypes(): Promise<void> {
    const session = this.neo4jService.initSession();
    const tx = session.beginTransaction();

    try {
      const markTypes = [
        ...Object.values(OnchainMarkTypeEnum).map((name) => ({ name, onchain: true })),
        ...Object.values(OffchainMarkTypeEnum).map((name) => ({ name, onchain: false })),
      ];

      for (const type of markTypes) {
        await tx.run(
          cypher /* cypher */`
            MERGE (:MarkType {name: $name, onchain: $onchain})
          `,
          type,
        );
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    } finally {
      await session.close();
    }
  }
}
