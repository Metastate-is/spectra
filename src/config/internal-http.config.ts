import { registerAs } from "@nestjs/config";

const DEFAULT_TIMEOUT_MS = 5000;

export default registerAs("internalHttp", () => {
  const parsedTimeout = Number(process.env.INTERNAL_HTTP_TIMEOUT_MS);
  return {
    botUrl: (process.env.BOT_INTERNAL_URL || "http://localhost:3000").replace(/\/+$/, ""),
    token: process.env.INTERNAL_API_TOKEN || "",
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS,
  };
});
