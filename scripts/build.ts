import { writeFileSync } from "fs";
import { join } from "path";

import { compileEscrowCode } from "../src/Escrow.source";

if (require.main === module) {
  compileEscrowCode()
    .then((result) => {
      if (!result) throw Error("Build error");

      console.log("Smart contract code BOC:");
      console.log(result.codeBoc);

      const buildBolder = join(__dirname, "..", "build");

      const fiftCellSource = '"Asm.fif" include\n' + result?.fiftCode + "\n";
      writeFileSync(join(buildBolder, "escrow.fif"), fiftCellSource.replace(/\\n/g, "\n"), "utf8");
      console.log("Fift code has been saved to build/escrow.fif");

      writeFileSync(join(buildBolder, "escrow.cell"), Buffer.from(result.codeBoc, "base64"));
      console.log("Raw cell has been saved to build/escrow.cell");
    })
    .catch((e) => {
      console.warn("Compilation error:");
      console.log(JSON.stringify(e, undefined, 2));
      process.exit(1);
    });
}
