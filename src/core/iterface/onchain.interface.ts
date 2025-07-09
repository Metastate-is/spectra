import { OnchainMarkType } from "src/type";
import type { IBaseMark } from "./base.interface";
import type { DateTime } from "neo4j-driver";

export interface IOnchainMark extends IBaseMark {
  markType: OnchainMarkType;
  txHash?: string;
  confirmedAt?: DateTime;
}
