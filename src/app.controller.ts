import { Controller, Get } from "@nestjs/common";
import { OffchainService } from "./modules/offchain/offchain.service";
import { OffchainMarkType } from "./type";
import { StructuredLoggerService } from "./core/logger";

@Controller()
export class AppController {
  constructor(private readonly offchainService: OffchainService, private readonly logger: StructuredLoggerService) {
    this.logger.setContext(AppController.name);
  }

  @Get("/create-mark")
  createMark() {
    this.offchainService.process({
      fromParticipantId: "2",
      toParticipantId: "7",
      markType: OffchainMarkType.RELATION,
      value: false,
    });
  }
}
