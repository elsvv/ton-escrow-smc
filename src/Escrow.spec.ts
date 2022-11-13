import { BN } from "bn.js";
import { Cell, InternalMessage, toNano } from "ton";
import { SendMsgAction, TvmRunnerAsynchronous } from "ton-contract-executor";
import { EscrowData } from "./Escrow.data";
import { compileEscrowCode } from "./Escrow.source";
import { ErrorCodes, EscrowLocal, OpCodes } from "./EscrowContractLocal";
import { createIntMsgBody, createAdresses, parseIntOutmsg } from "./utils";

const defaultConfig: EscrowData = {
  ...createAdresses(),
  orderId: 123,
  fullPrice: toNano(0),
  guarantorRoyalty: toNano(0),
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
    const addresses = createAdresses();

    const escrow = await EscrowLocal.createFromConfig(
      {
        ...defaultConfig,
        ...addresses,
      },
      codeCell
    );

    const msg1 = new InternalMessage({
      from: addresses.guarantorAddress,
      to: escrow.address,
      value: toNano(1),
      bounce: false,
      body: createIntMsgBody(
        EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) })
      ),
    });

    msg1.writeTo(new Cell());
    const res1 = await escrow.contract.sendInternalMessage(msg1);
    expect(res1.exit_code).toEqual(ErrorCodes.not_a_buyer);

    let info1 = await escrow.getInfo();
    expect(info1.inited.eq(new BN(0))).toBe(true);

    const msg2 = new InternalMessage({
      from: addresses.buyerAddress,
      to: escrow.address,
      value: toNano(1),
      bounce: false,
      body: createIntMsgBody(
        EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) })
      ),
    });

    msg2.writeTo(new Cell());
    const res = await escrow.contract.sendInternalMessage(msg2);
    expect(res.exit_code).toEqual(0);

    let info2 = await escrow.getInfo();
    expect(info2.inited.eq(new BN(1))).toBe(true);
  });

  it("Should accept deal correctly", async () => {
    const addresses = createAdresses();
    const escrow = await EscrowLocal.createFromConfig(
      {
        ...defaultConfig,
        ...addresses,
      },
      codeCell
    );

    const fullPrice = toNano(1);
    const guarantorRoyalty = toNano(0.2);

    const msg1 = new InternalMessage({
      from: addresses.buyerAddress,
      to: escrow.address,
      value: toNano(1.3),
      bounce: false,
      body: createIntMsgBody(EscrowLocal.createDeployBody({ fullPrice, guarantorRoyalty })),
    });
    msg1.writeTo(new Cell());
    const res1 = await escrow.contract.sendInternalMessage(msg1);
    expect(res1.exit_code).toEqual(0);

    await escrow.contract.setBalance(toNano(1.3));

    const msg2 = new InternalMessage({
      from: addresses.guarantorAddress,
      to: escrow.address,
      value: toNano(0.1),
      bounce: true,
      body: createIntMsgBody(EscrowLocal.createAcceptBody()),
    });
    msg2.writeTo(new Cell());

    const res2 = await escrow.contract.sendInternalMessage(msg2);
    expect(res2.exit_code).toEqual(0);
    expect(res2.actionList.length).toBe(3);

    const sellerAction = parseIntOutmsg(res2.actionList[0] as SendMsgAction);
    expect(sellerAction.type).toEqual("send_msg");
    expect(sellerAction.mode).toEqual(1);
    expect(sellerAction.body.beginParse().readUint(32).toNumber()).toEqual(
      OpCodes.success_seller_notification
    );
    expect(sellerAction.coins.eq(fullPrice.sub(guarantorRoyalty))).toBe(true);

    const guarantorAction = parseIntOutmsg(res2.actionList[1] as SendMsgAction);
    expect(guarantorAction.type).toEqual("send_msg");
    expect(guarantorAction.mode).toEqual(1);
    expect(guarantorAction.body.beginParse().readUint(32).toNumber()).toEqual(
      OpCodes.success_guarantor_notification
    );
    expect(guarantorAction.coins.eq(guarantorRoyalty)).toBe(true);

    const buyerAction = parseIntOutmsg(res2.actionList[2] as SendMsgAction);
    expect(buyerAction.type).toEqual("send_msg");
    expect(buyerAction.mode).toEqual(128 + 32);
    expect(buyerAction.body.beginParse().readUint(32).toNumber()).toEqual(
      OpCodes.success_buyer_notification
    );
  });

  afterAll(async () => {
    await TvmRunnerAsynchronous.getShared().cleanup(); // close all opened threads
  });
});
