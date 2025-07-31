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
      fromParticipantId: "user1",
      toParticipantId: "user2",
      markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    });
  }

  @Get("/create")
  @UsePipes(new ValidationPipe({ transform: true }))
  async createMark() {

    /**
     * Связка
     * user1 -> user2 
     * 
     * Мы должный найти между ними пользоателей 
     * Между ними пользователей должно быть 0
     * 
     * user2 -> user3
     * user1 -> user4
     * 
     * Между ними пользователей должно быть 0
     * user5 -> user1
     * user5 -> user2
     * 
     * Между ними пользователей должно быть user6
     * user1 -> user6
     * user2 -> user6  
     * 
     * Независит какое значение true или false 
     * Нужно найти само наличие общей связи
     * 
     * Вернуть 
     * positive: Количество положительных оценок только от общих нод к user2
     * negative: Количество отрицательных оценок только от общих нод к user2
     * commonCount: Количество общих нод
     */
    // await this.offchainService.process({
    //   fromParticipantId: "user1",
    //   toParticipantId: "user2",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });
    
    // //

    // await this.offchainService.process({
    //   fromParticipantId: "user2",
    //   toParticipantId: "user3",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });

    // await this.offchainService.process({
    //   fromParticipantId: "user1",
    //   toParticipantId: "user4",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });

    // // 
    // await this.offchainService.process({
    //   fromParticipantId: "user5",
    //   toParticipantId: "user1",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });
    // await this.offchainService.process({
    //   fromParticipantId: "user5",
    //   toParticipantId: "user2",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });

    // //
    // await this.offchainService.process({
    //   fromParticipantId: "user1",
    //   toParticipantId: "user6",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });
    // await this.offchainService.process({
    //   fromParticipantId: "user2",
    //   toParticipantId: "user6",
    //   markType: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
    //   value: true,
    // });


  }
}
