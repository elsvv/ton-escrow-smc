import { writeFileSync } from "fs";

import { compileEscrowCode } from "../src/Escrow.source";

if (require.main === module) {
  compileEscrowCode()
    .then((result) => {
      if (!result) throw Error("Build error");

      console.log("Smart contract code BOC:");
      console.log(result.codeBoc);

      const fiftCellSource = '"Asm.fif" include\n' + result?.fiftCode + "\n";
      writeFileSync("build/escrow.fif", fiftCellSource.replace(/\\n/g, "\n"), "utf8");
      console.log("Fift code was wrote to build/escrow.fif");

      writeFileSync("build/escrow.cell", Buffer.from(result.codeBoc, "base64"));
      console.log("Raw cell was wrote to build/escrow.cell");
    })
    .catch((e) => {
      console.warn("Compilation error:");
      console.log(JSON.stringify(e, undefined, 2));
      process.exit(1);
    });
}
