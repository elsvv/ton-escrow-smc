import { compileEscrowCode } from "../src/Escrow.source";

if (require.main === module) {
  compileEscrowCode()
    .then((result) => {
      console.log("Smart contract code BOC:");
      console.log(result!.codeBoc);
    })
    .catch((e) => {
      console.warn("Compilation error:");
      console.log(JSON.stringify(e, undefined, 2));
      process.exit(1);
    });
}
