import { Address, toNano } from "ton";
import qr from "qrcode-terminal";
import qs from "qs";

import { buildEscrowStateInit, EscrowData } from "../src/Escrow.data";
import { compileEscrowCode } from "../src/Escrow.source";
import { EscrowLocal } from "../src/EscrowContractLocal";

async function main() {
  let code = await compileEscrowCode();
  if (!code) {
    throw new Error("Compilation error");
  }

  const { address: buyerAddress } = Address.parseFriendly(
    "EQCtwXRh0SQe780YnH1QqUBF8-kYSctm1s0__gcxrWs_mjVn"
  );
  const { address: sellerAddress } = Address.parseFriendly(
    "kQCNsJFqatsGffjhXqsg9NVoWbI2b1H328tWaaNiJCqbiHpU"
  );
  const { address: guarantorAddress } = Address.parseFriendly(
    "EQAdeaoRSNRoV7ABKgr-gx70pSG6XTTPyITnGLTUZNevSYCO"
  );
  const orderId = 0xee;

  const data: Omit<EscrowData, "guarantorRoyalty" | "fullPrice"> = {
    buyerAddress,
    sellerAddress,
    guarantorAddress,
    orderId,
  };

  const body = EscrowLocal.createDeployBody({
    guarantorRoyalty: toNano("0.01"),
    fullPrice: toNano("0.1"),
  });

  const { address, stateInit } = buildEscrowStateInit(data, code.codeCell);

  console.log("Bouncable addres: ", address.toFriendly());
  console.log(
    "Non-bouncable addres: ",
    address.toFriendly({
      urlSafe: true,
      bounceable: false,
    })
  );

  const link = `ton://transfer/${address.toFriendly({
    urlSafe: true,
    bounceable: true,
  })}?${qs.stringify({
    amount: toNano("0.6").toString(10),
    bin: body.toBoc({ idx: false }).toString("base64url"),
    init: stateInit.toBoc({ idx: false }).toString("base64url"),
  })}`;

  console.log("link:\n---\n", link, "\n=====");
  qr.generate(link, { small: true }, (qrcode: string) => {
    console.log(qrcode);
  });
}

if (require.main === module) {
  main();
}
