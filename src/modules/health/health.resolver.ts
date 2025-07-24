import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get()
  health(): { status: string } {
    return { status: "OK" };
  }
}
