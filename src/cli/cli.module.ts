import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import neo4jConfig from 'src/config/neo4j.config';
import { Neo4jModule } from 'src/core/neo4j/neo4j.module';
import { InitNeo4jCommand } from './commands/init-neo4j.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [neo4jConfig],
    }),
    Neo4jModule.forRootAsync(),
  ],
  providers: [InitNeo4jCommand],
})
export class CliModule {}