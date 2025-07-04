import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { KafkaModule } from "./kafka.module";
import { KafkaService } from "./kafka.service";

describe("KafkaModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        KafkaModule,
        ConfigModule.forRoot({
          load: [
            () => ({
              kafka: {
                getClientOptions: () => ({
                  options: {
                    client: {
                      clientId: "test-client",
                      brokers: ["localhost:9092"],
                    },
                    consumer: {
                      groupId: "test-group",
                    },
                  },
                }),
              },
            }),
          ],
        }),
      ],
    }).compile();
  });

  it("should be defined", () => {
    expect(module).toBeDefined();
  });

  it("should provide KafkaService", () => {
    const service = module.get<KafkaService>(KafkaService);
    expect(service).toBeDefined();
  });
});
