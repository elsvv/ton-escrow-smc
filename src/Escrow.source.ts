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
  "te6ccgECDgEAAXIAART/APSkE/S88sgLAQIBIAIDAgFIBAUABPIwBPLQM9DTAwFxsPJA2zwG+kAGjzEyMzU1UTTHBfLh9foA+gAwAts8MFjbPFQTAVAzccjLAFAF+gJQA88WAc8Wyz/Mye1U4TEH0x8wIMAKjiYQRl8G0z8w7USAC3GAEMjLBVAFzxZw+gIUy2oTyx/LP8zJgED7AOA0I8ABDA0GBwIVoUvDtnm2eCBIIEcMDQAQyFjPFgH6AskCKpJfB+AjwALjAjICwAPjAl8FhA/y8AgJBG4zA9s8UWHHBfLh9vgnbxBQBaAhggr68ICgvvLh9yShgBZx2zwijoYCgBRx2zySbCHicIAVgQCgDQsLCgRWAts8MFFExwXy4fYCggr68IC+8uH3AnCAHoBA2zxxgCAhEDTbPHCAH4EAoA0LCwoBBNs8CwAwcIAQyMsFUAXPFlAD+gITy2oSyx/JAfsAAB7tRNDTAPoA+kD6QNM/1DAADND6QPoAMA==";

export const escrowCodeCell = Cell.fromBoc(Buffer.from(escrowCodeBoc, "base64"))[0];
