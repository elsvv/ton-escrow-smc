import { Address, Cell, CellMessage, CommonMessageInfo } from "ton";
import { randomBytes } from "crypto";
import { SendMsgAction } from "ton-contract-executor";

export * from "./files";

export const randomAddress = (workchain: number = 0) => new Address(workchain, randomBytes(32));

export const createIntMsgBody = (cell: Cell) =>
  new CommonMessageInfo({
    body: new CellMessage(cell),
  });

export const createAdresses = () => ({
  buyerAddress: randomAddress(),
  sellerAddress: randomAddress(),
  guarantorAddress: randomAddress(),
});

export function parseIntOutmsg(msg: SendMsgAction) {
  const {
    type,
    mode,
    message: { body, info },
  } = msg;

  if (info.type === "external-out") {
    throw new Error("This is an external-out message");
  }

  return { type, mode, body, coins: info.value.coins };
}
