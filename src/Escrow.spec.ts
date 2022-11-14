import { BN } from "bn.js";
import { Cell, InternalMessage, toNano } from "ton";
import { SendMsgAction, TvmRunnerAsynchronous } from "ton-contract-executor";
import { EscrowData, parseEscrowDataCell } from "./Escrow.data";
import { compileEscrowCode } from "./Escrow.source";
import { ErrorCodes, EscrowLocal, OpCodes } from "./EscrowContractLocal";
import { createAdresses, parseIntOutmsg } from "./utils";

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

  it("should return escrow of-chain info", async () => {
    const escrow = await EscrowLocal.createFromConfig(defaultConfig, codeCell);
    let res = await escrow.getInfo();

    expect(res.buyerAddress.toFriendly()).toEqual(defaultConfig.buyerAddress.toFriendly());
    expect(res.sellerAddress.toFriendly()).toEqual(defaultConfig.sellerAddress.toFriendly());
    expect(res.guarantorAddress.toFriendly()).toEqual(defaultConfig.guarantorAddress.toFriendly());
    expect(res.fullPrice.eq(defaultConfig.fullPrice)).toBe(true);
    expect(res.royalty.eq(defaultConfig.guarantorRoyalty)).toBe(true);
    expect(res.orderId.toString()).toEqual(defaultConfig.orderId.toString(10));
  });

  it("Should be inited only by a buyer", async () => {
    const addresses = createAdresses();

    const escrow = await EscrowLocal.createFromConfig(
      {
        ...defaultConfig,
        ...addresses,
      },
      codeCell
    );

    const res1 = await escrow.sendMsg({
      from: addresses.guarantorAddress,
      value: toNano(1),
      bounce: false,
      body: EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) }),
    });
    expect(res1.exit_code).toEqual(ErrorCodes.not_a_buyer);

    let info1 = await escrow.getInfo();
    expect(info1.inited.eq(new BN(0))).toBe(true);

    const res = await escrow.sendMsg({
      from: addresses.buyerAddress,
      value: toNano(1),
      bounce: false,
      body: EscrowLocal.createDeployBody({ fullPrice: toNano(1), guarantorRoyalty: toNano(0.2) }),
    });
    expect(res.exit_code).toEqual(0);

    let info2 = await escrow.getInfo();
    expect(info2.inited.eq(new BN(1))).toBe(true);
  });

  it("Should be accepted or rejected only by a guarantor", async () => {
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

    await escrow.sendMsg({
      from: addresses.buyerAddress,
      value: toNano(1.3),
      bounce: false,
      body: EscrowLocal.createDeployBody({ fullPrice, guarantorRoyalty }),
    });
    escrow.contract.setBalance(toNano(1.3));

    const res2 = await escrow.sendMsg({
      from: addresses.sellerAddress,
      value: toNano(0.1),
      bounce: true,
      body: EscrowLocal.createAcceptBody(),
    });
    expect(res2.exit_code).toEqual(ErrorCodes.not_a_guarantor);

    const res3 = await escrow.sendMsg({
      from: addresses.buyerAddress,
      value: toNano(0.1),
      bounce: true,
      body: EscrowLocal.createRejectBody(),
    });
    expect(res3.exit_code).toEqual(ErrorCodes.not_a_guarantor);
  });

  it("Should accept deal", async () => {
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

    const res1 = await escrow.sendMsg({
      from: addresses.buyerAddress,
      value: toNano(1.3),
      bounce: false,
      body: EscrowLocal.createDeployBody({ fullPrice, guarantorRoyalty }),
    });
    expect(res1.exit_code).toEqual(0);

    escrow.contract.setBalance(toNano(1.3));

    const res2 = await escrow.sendMsg({
      from: addresses.guarantorAddress,
      value: toNano(0.1),
      bounce: true,
      body: EscrowLocal.createAcceptBody(),
    });
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

  it("Should reject deal", async () => {
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

    const res1 = await escrow.sendMsg({
      from: addresses.buyerAddress,
      value: toNano(1.3),
      bounce: false,
      body: EscrowLocal.createDeployBody({ fullPrice, guarantorRoyalty }),
    });
    expect(res1.exit_code).toEqual(0);

    escrow.contract.setBalance(toNano(1.3));

    const res2 = await escrow.sendMsg({
      from: addresses.guarantorAddress,
      value: toNano(0.1),
      bounce: true,
      body: EscrowLocal.createRejectBody(),
    });
    expect(res2.exit_code).toEqual(0);
    expect(res2.actionList.length).toBe(3);

    const guarantorAction = parseIntOutmsg(res2.actionList[0] as SendMsgAction);
    expect(guarantorAction.type).toEqual("send_msg");
    expect(guarantorAction.mode).toEqual(64);
    expect(guarantorAction.body.beginParse().readUint(32).toNumber()).toEqual(
      OpCodes.reject_guarantor_notification
    );
    // TODO: find out why there are wrong coin values
    // console.log("guarantorAction.coins", guarantorAction.coins.toString(10));

    const sellerAction = parseIntOutmsg(res2.actionList[1] as SendMsgAction);
    expect(sellerAction.type).toEqual("send_msg");
    expect(sellerAction.mode).toEqual(1);
    expect(sellerAction.body.beginParse().readUint(32).toNumber()).toEqual(
      OpCodes.reject_seller_notification
    );

    const buyerAction = parseIntOutmsg(res2.actionList[2] as SendMsgAction);
    expect(buyerAction.type).toEqual("send_msg");
    expect(buyerAction.mode).toEqual(128 + 32);
    expect(buyerAction.body.beginParse().readUint(32).toNumber()).toEqual(
      OpCodes.reject_buyer_notification
    );
    // TODO: find out why there are wrong coin values
    // console.log("buyerAction.coins", buyerAction.coins.toString(10));
    // expect(buyerAction.coins.gt(fullPrice)).toBe(true);
  });

  // it("should return escrow on-chain info", async () => {
  //   const addresses = createAdresses();
  //   const escrow = await EscrowLocal.createFromConfig({ ...defaultConfig, ...addresses }, codeCell);

  //   const _fullPrice = toNano(1);
  //   const _guarantorRoyalty = toNano(0.2);

  //   const msg1 = new InternalMessage({
  //     from: addresses.buyerAddress,
  //     to: escrow.address,
  //     value: toNano(1.3),
  //     bounce: false,
  //     body: createIntMsgBody(
  //       EscrowLocal.createDeployBody({ fullPrice: _fullPrice, guarantorRoyalty: _guarantorRoyalty })
  //     ),
  //   });
  //   msg1.writeTo(new Cell());
  //   await escrow.contract.sendInternalMessage(msg1);

  //   escrow.contract.setBalance(toNano(1.3));

  //   const msg = new InternalMessage({
  //     from: addresses.guarantorAddress,
  //     to: escrow.address,
  //     value: toNano(0.1),
  //     bounce: true,
  //     body: createIntMsgBody(EscrowLocal.createGetInfoBody(777)),
  //   });
  //   msg.writeTo(new Cell());

  //   const res = await escrow.contract.sendInternalMessage(msg);
  //   expect(res.exit_code).toEqual(0);
  //   expect(res.actionList.length).toBe(1);

  //   const infoAction = parseIntOutmsg(res.actionList[0] as SendMsgAction);
  //   const { buyerAddress, sellerAddress, guarantorAddress, fullPrice, guarantorRoyalty, orderId } =
  //     parseEscrowDataCell(infoAction.body.beginParse().readCell());

  //   let res2 = await escrow.getInfo();

  //   expect(res2.buyerAddress.toFriendly()).toEqual(buyerAddress!.toFriendly());
  //   expect(res2.sellerAddress.toFriendly()).toEqual(sellerAddress!.toFriendly());
  //   expect(res2.guarantorAddress.toFriendly()).toEqual(guarantorAddress!.toFriendly());
  //   expect(res2.fullPrice.eq(fullPrice)).toBe(true);
  //   expect(res2.royalty.eq(guarantorRoyalty)).toBe(true);
  //   expect(res2.orderId.toString()).toEqual(orderId.toString(10));
  // });

  afterAll(async () => {
    await TvmRunnerAsynchronous.getShared().cleanup(); // close all opened threads
  });
});
