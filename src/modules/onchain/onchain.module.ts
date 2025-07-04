import { Global, Module } from '@nestjs/common';
import { Neo4jModule } from 'src/core/neo4j/neo4j.module';
import { OnchainService } from './onchain.service';

@Global()
@Module({
  imports: [Neo4jModule],
  providers: [OnchainService],
  exports: [OnchainService]
})
export class OnchainModule {}