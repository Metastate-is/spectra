import { Global, Module } from "@nestjs/common";
import { InternalHttpModule } from "src/core/internal-http/internal-http.module";
import { OnchainService } from "./onchain.service";

@Global()
@Module({
  imports: [InternalHttpModule],
  providers: [OnchainService],
  exports: [OnchainService],
})
export class OnchainModule {}
