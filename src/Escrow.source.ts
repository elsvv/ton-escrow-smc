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
  "te6ccgECDgEAAWwAART/APSkE/S88sgLAQIBIAIDAgFIBAUABPIwBPLQAdDTAwFxsPJA2zwG+kAGjy80NDY2JccF8uH1AvoA+gAwAts8MFjbPBRDMHHIywBQBfoCUAPPFgHPFss/zMntVOExBtMfMCDACo4oEEVfBWwi0z8w7USAC3GAEMjLBVAFzxZw+gIUy2oTyx/LP8zJgED7AOA0I8ABDA0GBwIVoUvDtnm2eCBIIEcMDQAQyFjPFgH6AskCLJJfCOAjwALjAjI2AcAD4wJfBYQP8vAICQRmMzUC2zxRQccF8uH2IoIJMS0AoBa58tH3URKhgBZx2zwgjoYSgBRx2zySMDHicIAVgQCgDQsLCgRQAds8MFEixwXy4fYCggkxLQC+8uH3cIAegEDbPHGAICHbPHCAH4EAoA0LCwoBBNs8CwAwcIAQyMsFUAXPFlAD+gITy2oSyx/JAfsAAB7tRNDTAPoA+kD6QNM/1DAADND6QPoAMA==";

export const escrowCodeCell = Cell.fromBoc(Buffer.from(escrowCodeBoc, "base64"))[0];
