import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import neo4jConfig from "src/config/neo4j.config";
import { Neo4jModule } from "src/core/neo4j/neo4j.module";
import { InitNeo4jCommand } from "./commands/init-neo4j.command";
import { SyncMetaStateCommand } from "./commands/sync-metastate.command";
import { MetastateModule } from "src/modules/metastate/metastate.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [neo4jConfig],
    }),
    Neo4jModule.forRootAsync(),
    MetastateModule,
    ConfigModule
  ],
  providers: [InitNeo4jCommand, SyncMetaStateCommand],
})
export class CliModule {}
