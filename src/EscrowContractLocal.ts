import { SmartContract } from "ton-contract-executor";
import { Address, Builder, Cell, contractAddress, Slice } from "ton";
import BN from "bn.js";

import { compileEscrowCode } from "./Escrow.source";
import { buildEscrowDataCell, EscrowData } from "./Escrow.data";

export enum OpCodes {
  topUp = 1,
  accept = 2,
  reject = 3,
  get_info_onchain = 10,
  get_info_response = 11,
  success_guarantor_notification = 20,
  success_buyer_notification = 21,
  success_seller_notification = 22,
  reject_guarantor_notification = 30,
  reject_buyer_notification = 31,
  reject_seller_notification = 32,
}

export enum ErrorCodes {
  not_a_buyer = 501,
  not_a_guarantor = 502,
  min_gas_amount = 503,
}

type EscrowDeployBody = {
  guarantorRoyalty: EscrowData["guarantorRoyalty"];
  fullPrice: EscrowData["fullPrice"];
};

export class EscrowLocal {
  private constructor(public readonly contract: SmartContract, public readonly address: Address) {}

  async getInfo() {
    const res = await this.contract.invokeGetMethod("get_info", []);
    if (res.exit_code !== 0) {
      throw new Error(`Unable to invoke get_info on escrow contract`);
    }

    // (inited?, full_price, order_id, buyer_addr, seller_addr, guarantor_addr, royalty?)
    let [inited, fullPrice, orderId, buyer_addr, seller_addr, guarantor_addr, royalty] =
      res.result as [BN, BN, BN, Slice, Slice, Slice, BN];

    return {
      inited,
      fullPrice,
      orderId,
      royalty,
      guarantorAddress: guarantor_addr.readAddress()!,
      buyerAddress: buyer_addr.readAddress()!,
      sellerAddress: seller_addr.readAddress()!,
    };
  }

  static async createFromConfig(config: EscrowData, codeCell?: Cell) {
    const code = codeCell ?? (await compileEscrowCode())?.codeCell!;

    const data = buildEscrowDataCell(config);
    const contract = await SmartContract.fromCell(code, data);

    const address = contractAddress({
      workchain: 0,
      initialData: contract.dataCell,
      initialCode: contract.codeCell,
    });

    contract.setC7Config({
      myself: address,
    });

    return new EscrowLocal(contract, address);
  }

  static async create(config: { code: Cell; data: Cell; address: Address }) {
    let contract = await SmartContract.fromCell(config.code, config.data);
    contract.setC7Config({
      myself: config.address,
    });
    return new EscrowLocal(contract, config.address);
  }

  static createDeployBody(params: EscrowDeployBody) {
    return new Builder().storeCoins(params.fullPrice).storeCoins(params.guarantorRoyalty).endCell();
  }

  static createAcceptBody() {
    return new Builder().storeUint(OpCodes.accept, 32).endCell();
  }

  static createRejectBody() {
    return new Builder().storeUint(OpCodes.reject, 32).endCell();
  }

  static createGetInfoBody(queryId: number = 0) {
    return new Builder().storeUint(OpCodes.reject, 32).storeUint(queryId, 64).endCell();
  }

  static createTopUpBody() {
    return new Builder().storeUint(OpCodes.topUp, 32).endCell();
  }
}
