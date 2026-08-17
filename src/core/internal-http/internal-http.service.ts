import { MarkCreated } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_created";
import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StructuredLoggerService } from "../logger";

interface InternalHttpConfig {
  botUrl: string;
  token: string;
  timeoutMs: number;
}

const MIN_INTERNAL_TOKEN_LENGTH = 32;

@Injectable()
export class InternalHttpService {
  private readonly logger = new StructuredLoggerService();

  constructor(private readonly configService: ConfigService) {
    this.logger.setContext(InternalHttpService.name);
  }

  async sendMarkCreated(message: MarkCreated): Promise<void> {
    const config = this.configService.get<InternalHttpConfig>("internalHttp");
    if (!config?.token || config.token.length < MIN_INTERNAL_TOKEN_LENGTH) {
      throw new ServiceUnavailableException(
        "INTERNAL_API_TOKEN must contain at least 32 characters",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    let response: Response;
    try {
      response = await fetch(new URL("/internal/events/mark-created", `${config.botUrl}/`), {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });
    } catch (error) {
      this.logger.error("Bot internal REST request failed", error as Error, {
        meta: { timeoutMs: config.timeoutMs },
      });
      throw new ServiceUnavailableException("Bot internal API is unavailable");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new BadGatewayException(`Bot internal API returned HTTP ${response.status}`);
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch (error) {
      this.logger.error("Bot internal REST response is not valid JSON", error as Error);
      throw new BadGatewayException("Bot internal API returned an invalid response");
    }

    if (
      !result ||
      typeof result !== "object" ||
      !("processed" in result) ||
      result.processed !== true
    ) {
      throw new BadGatewayException("Bot internal API did not process mark-created");
    }
  }
}
