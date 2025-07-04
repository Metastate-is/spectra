import { Inject, Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Driver, RecordShape, Result, Session } from "neo4j-driver";

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  constructor(
    @Inject("NEO4J")
    private readonly driver: Driver,
  ) {}

  onApplicationShutdown(): void {
    this.driver.close();
  }

  initSession(): Session {
    return this.driver.session();
  }

  async runQuery(cypher: string, params: Record<string, any> = {}): Promise<Result<RecordShape>> {
    const session = this.initSession();
    try {
      return await session.run(cypher, params);
    } catch (e) {
      throw e;
    } finally {
      await session.close();
    }
  }
}
