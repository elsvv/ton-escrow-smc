import { writeFileSync } from "fs";
import { join } from "path";

import { compileEscrowCode } from "../src/Escrow.source";

if (require.main === module) {
  compileEscrowCode()
    .then((result) => {
      if (!result) throw Error("Build error");

      const buildBolder = join(__dirname, "..", "build");

      console.log("Smart contract code BOC:");
      console.log(result.codeBoc);

      console.log("\n=====\n");

      const fiftCellSource = '"Asm.fif" include\n' + result?.fiftCode + "\n";
      writeFileSync(join(buildBolder, "escrow.fif"), fiftCellSource.replace(/\\n/g, "\n"), "utf8");
      console.log("Fift code has been saved to build/escrow.fif");

      writeFileSync(join(buildBolder, "escrow.cell"), Buffer.from(result.codeBoc, "base64"));
      console.log("Raw cell has been saved to build/escrow.cell");

      writeFileSync(join(buildBolder, "escrow.cell.base64"), result.codeBoc, "utf8");
      console.log("Base64 cell boc has been saved to build/escrow.cell.base64");
    })
    .catch((e) => {
      console.warn("Compilation error:");
      console.log(JSON.stringify(e, undefined, 2));
      process.exit(1);
    });
}
