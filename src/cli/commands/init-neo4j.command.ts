import { Command, CommandRunner } from "nest-commander";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { OffchainMarkTypeEnum, OnchainMarkTypeEnum, OtherTypeNodes } from "src/type";
import { cypher } from "src/utils/cypher";
import { StructuredLoggerService } from "../../core/logger";

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
      this.l.error("[INIT ERROR] Ошибка инициализации", error as Error);
      process.exit(1);
    } finally {
      this.l.endTrace();
    }
  }

  async initializeMarkTypes(): Promise<void> {
    const session = this.neo4jService.initSession();
    const tx = session.beginTransaction();

    try {
      const types = [
        ...Object.values(OnchainMarkTypeEnum).map((name) => ({ name, onchain: true })),
        ...Object.values(OffchainMarkTypeEnum).map((name) => ({ name, onchain: false })),
        ...Object.values(OtherTypeNodes).map(() => ({})),
      ];

      for (const type of types) {
        if ("onchain" in type) {
          await tx.run(
            cypher /* cypher */`
              MERGE (:MarkType {name: $name, onchain: $onchain})
            `,
            type,
          );
          continue;
        }

        await tx.run(
          cypher /* cypher */`
            MERGE (:MarkType)
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
