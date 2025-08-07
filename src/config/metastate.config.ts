import { registerAs } from "@nestjs/config";

/**
 * Конфигурация metastate
 *
 * @property rpcUrl - URL подключения к ноде
 * @property privateKey - Приватный ключ
 * @property contractAddress - Адрес контракта
 */
export default registerAs("metastate", () => ({
  rpcUrl: process.env.RPC_URL,
  privateKey: process.env.RPC_PRIVATE_KEY,
  contractAddress: process.env.REPUTATION_CONTRACT_ADDRESS,
}));
