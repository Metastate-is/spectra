import { OffchainMarkTypeMap, OnchainMarkTypeMap } from "src/type";

export const isValidOnchainMarkType = (key: unknown): key is keyof typeof OnchainMarkTypeMap => {
  return typeof key === 'string' && key in OnchainMarkTypeMap;
}


export const isValidOffchainMarkType = (key: unknown): key is keyof typeof OffchainMarkTypeMap => {
  return typeof key === 'string' && key in OffchainMarkTypeMap;
}