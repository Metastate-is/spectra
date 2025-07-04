import { Global, Module } from "@nestjs/common";
import { OffchainService } from "./offchain.service";
import { Neo4jModule } from "src/core/neo4j/neo4j.module";

@Global()
@Module({
  imports: [Neo4jModule],
  providers: [OffchainService],
  exports: [OffchainService],
})
export class OffchainModule {}
