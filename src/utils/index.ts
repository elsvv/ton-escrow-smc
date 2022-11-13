import { Address } from "ton";
import { randomBytes } from "crypto";

export * from "./files";

export const randomAddress = (workchain: number = 0) => new Address(workchain, randomBytes(32));
