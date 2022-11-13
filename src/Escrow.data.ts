import { Address, Cell, contractAddress, StateInit, toNano, Contract } from "ton";
import BN from "bn.js";
import { escrowCodeCell } from "./Escrow.source";
import { Builder } from "ton";

export type EscrowData = {
  sellerAddress: Address;
  buyerAddress: Address;
  fullPrice: BN;
  orderId: number;
  guarantorAddress: Address;
  guarantorRoyalty: BN;
};

export function buildEscrowDataCell({
  guarantorAddress,
  guarantorRoyalty,
  fullPrice,
  sellerAddress,
  buyerAddress,
  orderId,
}: EscrowData) {
  const guarantorData = new Builder().storeAddress(guarantorAddress).storeCoins(guarantorRoyalty);

  const dataCell = new Builder()
    .storeUint(0, 1)
    .storeCoins(fullPrice)
    .storeAddress(buyerAddress)
    .storeAddress(sellerAddress)
    .storeUint(orderId, 64)
    .storeRef(guarantorData.endCell())
    .endCell();

  return dataCell;
}

export function buildEscrowStateInit(
  data: Omit<EscrowData, "guarantorRoyalty" | "fullPrice">,
  code?: Cell
) {
  const dataCell = buildEscrowDataCell({
    ...data,
    // these are will be setted on deploy to make nft discoverable by only knowing of order_id and adresses
    guarantorRoyalty: toNano(0),
    fullPrice: toNano(0),
  });

  const codeCell = code ?? escrowCodeCell;

  const _stateInit = new StateInit({
    code: codeCell,
    data: dataCell,
  });
  const stateInit = new Cell();
  _stateInit.writeTo(stateInit);

  const address = contractAddress({
    workchain: 0,
    initialCode: codeCell,
    initialData: dataCell,
  });

  return {
    address,
    stateInit,
    codeCell,
    dataCell,
  };
}
