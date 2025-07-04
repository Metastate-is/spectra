import { Command, CommandRunner } from "nest-commander";
import { StructuredLoggerService } from "../../core/logger";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { OffchainMarkType, OnchainMarkType } from "src/type";

@Command({
  name: "init-neo4j",
  description: "Initialize the neo4j database",
})
export class InitNeo4jCommand extends CommandRunner {
  private readonly l = new StructuredLoggerService();

  constructor(private readonly neo4jService: Neo4jService) {
    super();
    this.l.setContext(InitNeo4jCommand.name);
  }

  async run(_passedParams: string[]): Promise<void> {
    this.l.startTrace();
    try {
      // Инициализируем модели
      await this.initializeMarkTypes();
      // Вешаем индексы
    } catch (error) {
      process.exit(1);
    } finally {
    }
  }

  async initializeMarkTypes(): Promise<void> {
    const session = this.neo4jService.initSession();
    const tx = session.beginTransaction();

    try {
      const types = [
        ...Object.values(OnchainMarkType).map((name) => ({ name, onchain: true })),
        ...Object.values(OffchainMarkType).map((name) => ({ name, onchain: false })),
      ];

      for (const type of types) {
        await tx.run(
          /* cypher */ `
          MERGE (:MarkType {name: $name, onchain: $onchain})
        `,
          type,
        );
      }

      await tx.commit();
      console.log("[INIT] MarkTypes инициализированы");
    } catch (err) {
      console.error("[INIT ERROR] Ошибка инициализации MarkTypes", err);
      await tx.rollback();
      throw err;
    } finally {
      await session.close();
    }
  }
}
