import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import neo4j, { Driver } from "neo4j-driver";
import { Neo4jService } from "./neo4j.service";

@Global()
@Module({
  providers: [Neo4jService],
  exports: [Neo4jService],
})
export class Neo4jModule {
  static forRootAsync(): DynamicModule {
    return {
      module: Neo4jModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: "NEO4J",
          inject: [ConfigService],
          useFactory: async (configService: ConfigService): Promise<Driver> => {
            try {
              const url = configService.get<string>("neo4j.url")!;
              const user = configService.get<string>("neo4j.user");
              const password = configService.get<string>("neo4j.password");

              const driver: Driver = neo4j.driver(
                url,
                neo4j.auth.basic(user as string, password as string),
              );

              return driver;
            } catch (error) {
              throw new Error(error);
            }
          },
        },
      ],
      exports: ["NEO4J", Neo4jService],
    };
  }
}
