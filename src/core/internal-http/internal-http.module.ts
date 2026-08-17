import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InternalApiGuard } from "./internal-api.guard";
import { InternalHttpService } from "./internal-http.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [InternalApiGuard, InternalHttpService],
  exports: [InternalApiGuard, InternalHttpService],
})
export class InternalHttpModule {}
