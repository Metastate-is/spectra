import { timingSafeEqual } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const MIN_INTERNAL_TOKEN_LENGTH = 32;

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>("internalHttp.token");
    if (!token || token.length < MIN_INTERNAL_TOKEN_LENGTH) {
      throw new ServiceUnavailableException(
        "INTERNAL_API_TOKEN must contain at least 32 characters",
      );
    }

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const authorization = request.headers.authorization;
    const expected = `Bearer ${token}`;
    if (!authorization) {
      throw new UnauthorizedException("Internal API token is required");
    }

    const actualBuffer = Buffer.from(authorization);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Invalid internal API token");
    }
    return true;
  }
}
