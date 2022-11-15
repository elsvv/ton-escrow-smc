import { compileFunc } from "@ton-community/func-js";
import { Cell } from "ton";
import { join } from "path";
import { getFolderFilesNames, getSourceMap } from "./utils";

const funcFolder = join(__dirname, "func");
const funcFiles = getFolderFilesNames(funcFolder);

export async function compileEscrowCode() {
  const sources = getSourceMap(funcFiles, funcFolder);

  try {
    const result = await compileFunc({
      entryPoints: ["main.fc"],
      sources,
    });

    if (result.status === "error") {
      throw result;
    }

    const codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];

    return { ...result, codeCell };
  } catch (e) {
    console.warn("compileFunc error:", e);
  }
}

export const escrowCodeBoc =
  "te6ccgECDgEAAWsAART/APSkE/S88sgLAQIBIAIDAgFIBAUABPIwBPLQAdDTAwFxsPJA2zwG+kAwBY8vMzY2URXHBfLh9QL6APoAMALbPDBY2zwUQzBxyMsAUAX6AlADzxYBzxbLP8zJ7VThMAXTHyHACo4oNV8DbCIy0z8w7USAC3CAEMjLBVAFzxYk+gIUy2oTyx/LP8zJgED7AOAwIMABDA0GBwIVoUvDtnm2eCBIIEcMDQAQyFjPFgH6AskCKpJfCOAgwALjAjI2wAPjAl8FhA/y8AgJBGYwNQLbPFEhxwXy4fYiggkxLQCgFrny0fdmoRKAFnHbPCCOhhKAFHHbPJIwMeJwgBWBAKANCwsKBFAB2zwwZscF8uH2AoIJMS0AvvLh9wFwgB6AQNs8cYAgIds8cIAfgQCgDQsLCgEE2zwLADBwgBDIywVQBc8WUAP6AhPLahLLH8kB+wAAHu1E0NMA+gD6QPpA0z/UMAAM0PpA+gAw";

export const escrowCodeCell = Cell.fromBoc(Buffer.from(escrowCodeBoc, "base64"))[0];
