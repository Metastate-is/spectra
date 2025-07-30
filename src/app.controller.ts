import { Controller, Get, UsePipes, ValidationPipe } from "@nestjs/common";
import { StructuredLoggerService } from "./core/logger";
import { OffchainService } from "./modules/offchain/offchain.service";
import { OffchainMarkTypeEnum } from "./type";

@Controller()
export class AppController {
  constructor(
    private readonly offchainService: OffchainService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext(AppController.name);
  }

  @Get("/get-mark")
  @UsePipes(new ValidationPipe({ transform: true }))
  getMark() {
    return this.offchainService.getReputationContext({
      fromParticipantId: "user123",
      toParticipantId: "user456",
      markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    });
  }
}
