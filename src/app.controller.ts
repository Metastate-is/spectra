import { Controller, Get } from "@nestjs/common";
import { OffchainService } from "./modules/offchain/offchain.service";
import { OffchainMarkType } from "./type";

@Controller()
export class AppController {
  constructor(private readonly offchainService: OffchainService) {
  }
  @Get('/create-mark')
  createMark() {
    this.offchainService.process({
      fromParticipantId: '1',
      toParticipantId: '2',
      markType: OffchainMarkType.RELATION,
      value: false,
      createdAt: new Date(),
    });
  }
}