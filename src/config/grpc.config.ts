import { join } from "path";
import { registerAs } from "@nestjs/config";
import { ClientProviderOptions, Transport } from "@nestjs/microservices";

// Constants for the News gRPC service
export const NEWS_PACKAGE_NAME = "metastate.grpc.bot.v1"; // Package name from channel_news.proto
export const NEWS_SERVICE_NAME_FROM_PROTO = "NewsService"; // Service name from channel_news.proto
export const NEWS_CLIENT_INJECTION_TOKEN = "NEWS_SERVICE_CLIENT"; // Custom injection token for the gRPC client
export const NEWS_GRPC_CONFIG_KEY = "newsGrpc"; // Key for accessing this configuration via ConfigService

export const GROUP_SUMMARY_CLIENT_INJECTION_TOKEN = "GROUP_SUMMARY_SERVICE_CLIENT";
export const GROUP_SUMMARY_PACKAGE_NAME = "metastate.grpc.bot.v1";
export const GROUP_SUMMARY_SERVICE_NAME_FROM_PROTO = "GroupSummaryService";
export const GROUP_SUMMARY_GRPC_CONFIG_KEY = "groupSummaryGrpc";

/**
 * Configuration for the News gRPC client.
 * This will be registered with NestJS's ConfigModule.
 */
export const newsGrpcConfig = registerAs(
  NEWS_GRPC_CONFIG_KEY,
  (): ClientProviderOptions => ({
    // 'name' is used as the injection token for the gRPC client.
    // It can be a string or a symbol.
    name: NEWS_CLIENT_INJECTION_TOKEN,
    transport: Transport.GRPC,
    options: {
      // The URL of the gRPC service, loaded from environment variables.
      url: process.env.GRPC_BOT_SERVICE_URL || "localhost:50051",
      // The package name defined in the .proto file.
      package: NEWS_PACKAGE_NAME,
      // Path to the main .proto file, relative to one of the 'includeDirs'.
      protoPath: join("metastate", "grpc", "bot", "v1", "channel_news.proto"),
      loader: {
        keepCase: false, // Converts snake_case to camelCase and vice versa
        longs: String, // Converts long values to strings
        enums: String, // Converts enum values to strings
        defaults: true, // Sets default values for fields
        oneofs: true, // Processes oneof fields
        // Directories to search for imported .proto files.
        // 'channel_news.proto' imports 'metastate/common/v1/common.proto'.
        // This path should point to the root directory of 'metastate'.
        includeDirs: [join(process.cwd(), "node_modules", "@metastate-is", "proto-models")],
      },
    },
  }),
);

/**
 * Configuration for the Group Summary gRPC client.
 * This will be registered with NestJS's ConfigModule.
 */
export const groupSummaryGrpcConfig = registerAs(
  GROUP_SUMMARY_GRPC_CONFIG_KEY,
  (): ClientProviderOptions => ({
    name: GROUP_SUMMARY_CLIENT_INJECTION_TOKEN,
    transport: Transport.GRPC,
    options: {
      url: process.env.GRPC_BOT_SERVICE_URL || "localhost:50051",
      package: GROUP_SUMMARY_PACKAGE_NAME,
      protoPath: join("metastate", "grpc", "bot", "v1", "group_summary.proto"),
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(process.cwd(), "node_modules", "@metastate-is", "proto-models")],
      },
    },
  }),
);
