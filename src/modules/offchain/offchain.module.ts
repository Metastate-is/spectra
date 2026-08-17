import { Global, Module } from "@nestjs/common";
import { InternalHttpModule } from "src/core/internal-http/internal-http.module";
import { OffchainService } from "./offchain.service";

@Global()
@Module({
  imports: [InternalHttpModule],
  providers: [OffchainService],
  exports: [OffchainService],
})
export class OffchainModule {}
