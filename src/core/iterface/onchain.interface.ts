import type { DateTime } from "neo4j-driver";
import type { IBaseMark } from "./base.interface";

export interface IOnchainMark extends IBaseMark {
  txHash?: string;
  confirmedAt?: DateTime;
}
