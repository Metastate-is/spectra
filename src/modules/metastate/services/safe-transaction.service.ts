import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class SafeTransactionService {
  private readonly logger = new Logger(SafeTransactionService.name);

  constructor() {}

  async sendTransactionWithRetry(
    sendFn: () => Promise<ethers.TransactionResponse>,
    options?: {
      retries?: number;
      delayMs?: number;
    },
  ): Promise<ethers.TransactionReceipt | null> {
    const maxRetries = options?.retries ?? 3;
    const delayMs = options?.delayMs ?? 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tx = await sendFn();
        this.logger.log(`Transaction sent: ${tx.hash}, waiting for confirmation...`);
        const receipt = await tx.wait();
        this.logger.log(`Transaction confirmed: ${receipt?.hash}`);
        return receipt;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        this.logger.warn(
          `Transaction attempt ${attempt} failed: ${error.message || error}`,
        );

        if (isLastAttempt) {
          this.logger.error(`All ${maxRetries} transaction attempts failed.`);
          return null;
        }

        await this.sleep(delayMs);
      }
    }

    return null;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
