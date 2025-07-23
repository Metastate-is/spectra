import type { IBaseMark } from "./base.interface";
import type { DateTime } from "neo4j-driver";

export interface IOnchainMark extends IBaseMark {
  txHash?: string;
  confirmedAt?: DateTime;
}
