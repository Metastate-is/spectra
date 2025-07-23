import { OffchainMarkTypeMap, OnchainMarkTypeMap } from "src/type";

export const isValidOnchainMarkType = (index: number): index is keyof typeof OnchainMarkTypeMap => {
  return typeof index === "number" && OnchainMarkTypeMap[index] !== null;
};

export const isValidOffchainMarkType = (index: number): index is keyof typeof OffchainMarkTypeMap => {
  return typeof index === "number" && OffchainMarkTypeMap[index] !== null;
};
