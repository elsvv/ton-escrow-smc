import { BN } from "bn.js";
import { Cell, CellMessage, CommonMessageInfo, InternalMessage, toNano } from "ton";
import { TvmRunnerAsynchronous } from "ton-contract-executor";
import { EscrowData } from "./Escrow.data";
import { compileEscrowCode } from "./Escrow.source";
import { ErrorCodes, EscrowLocal } from "./EscrowContractLocal";
import { randomAddress } from "./utils";

const defaultConfig: EscrowData = {
  buyerAddress: randomAddress(),
  sellerAddress: randomAddress(),
  guarantorAddress: randomAddress(),
  fullPrice: toNano(0),
  guarantorRoyalty: toNano(0),
  orderId: 123,
};

describe("Escrow smc", () => {
  let codeCell: Cell;
  beforeAll(async () => {
    const res = await compileEscrowCode();
    codeCell = res!.codeCell;
  });

  it("should return escrow info", async () => {
    const escrow = await EscrowLocal.createFromConfig(defaultConfig, codeCell);
    let res = await escrow.getInfo();

    expect(res.buyerAddress.toFriendly()).toEqual(defaultConfig.buyerAddress.toFriendly());
    expect(res.sellerAddress.toFriendly()).toEqual(defaultConfig.sellerAddress.toFriendly());
    expect(res.guarantorAddress.toFriendly()).toEqual(defaultConfig.guarantorAddress.toFriendly());
    expect(res.fullPrice.eq(defaultConfig.fullPrice)).toBe(true);
    expect(res.royalty.eq(defaultConfig.guarantorRoyalty)).toBe(true);
    expect(res.orderId.toString()).toEqual(defaultConfig.orderId.toString(10));
  });

  it("Should be inited only by buyer", async () => {
    const buyerAddress = randomAddress();
    const sellerAddress = randomAddress();
    const guarantorAddress = randomAddress();

    const escrow = await EscrowLocal.createFromConfig(
      {
        ...defaultConfig,
        buyerAddress,
        sellerAddress,
        guarantorAddress,
      },
      codeCell
    );

    const msg1 = new InternalMessage({
      from: guarantorAddress,
      to: escrow.address,
      value: toNano(1),
      bounce: false,
      body: new CommonMessageInfo({
        body: new CellMessage(
          EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) })
        ),
      }),
    });
    const msgCell1 = new Cell();
    msg1.writeTo(msgCell1);

    const res1 = await escrow.contract.sendInternalMessage(msg1);
    expect(res1.exit_code).toEqual(ErrorCodes.not_a_buyer);
    let info1 = await escrow.getInfo();
    expect(info1.inited.eq(new BN(0))).toBe(true);

    const msg2 = new InternalMessage({
      from: buyerAddress,
      to: escrow.address,
      value: toNano(1),
      bounce: false,
      body: new CommonMessageInfo({
        body: new CellMessage(
          EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) })
        ),
      }),
    });
    const msgCell2 = new Cell();
    msg2.writeTo(msgCell2);

    const res = await escrow.contract.sendInternalMessage(msg2);
    expect(res.exit_code).toEqual(0);
    let info2 = await escrow.getInfo();
    expect(info2.inited.eq(new BN(1))).toBe(true);
  });

  it("Should accept first msg only from buyer", async () => {
    const buyerAddress = randomAddress();
    const sellerAddress = randomAddress();
    const guarantorAddress = randomAddress();

    const escrow = await EscrowLocal.createFromConfig(
      {
        ...defaultConfig,
        buyerAddress,
        sellerAddress,
        guarantorAddress,
      },
      codeCell
    );

    const msg = new InternalMessage({
      from: guarantorAddress,
      to: escrow.address,
      value: toNano(1),
      bounce: false,
      body: new CommonMessageInfo({
        body: new CellMessage(
          EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) })
        ),
      }),
    });
    const msgCell = new Cell();
    msg.writeTo(msgCell);

    const res = await escrow.contract.sendInternalMessage(msg);
    expect(res.exit_code).toEqual(ErrorCodes.not_a_buyer);
  });

  afterAll(async () => {
    // close all opened threads
    await TvmRunnerAsynchronous.getShared().cleanup();
  });
});
