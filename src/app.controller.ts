import { Controller, Get } from "@nestjs/common";
import { OffchainService } from "./modules/offchain/offchain.service";
import { OffchainMarkType } from "./type";

@Controller()
export class AppController {
  constructor(private readonly offchainService: OffchainService) {}
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
