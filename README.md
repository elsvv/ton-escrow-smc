# TON Escrow smart contract

This repo contains func code, ts-based tests and related scripts for a simple escrow smart-contract.

### Logic description

Escrow contract allows to create an offer from a buyer to a seller. After a creation third party (guarantor) validates the offer. Validation could be made both onchain & offchain.

Then the guarantor can send a message with an `accept` op-code. It will cause closing of an offer, sending money to a seller and (if any) sending royalties to the guarantor.

The guarantor can send `reject` op-code and close an offer as well.

Each of these op-codes is accompanied by others related notify op-codes.

### Contract data

The TL-B contract storage scheme is shown below:

```
guarantor_data#_
  guarantor_address:MsgAddress guarantor_royalty:Coins = GuarantorData;

storage#_
  inited:uint1
  full_price:Coins
  buyer:MsgAddress
  seller:MsgAddress
  order_id:uint64
  guarantor_data:^GuarantorData
  = Storage;
```

### Deployment

Deployment of new contracts is done through internal messages only. External messages are quite difficult to handle without some extra protection to avoid unintended money spending.

Contracts' records of `full_price` and `royalty` are stored only after a deployment to keep a smart-contract's address discoverable by only knowing `buyer_address`, `seller_address`, `guarantor_address` and `order_id` data records.

## Environment

### Install typescript environment:

```sh
yarn
```

### Run tests:

```sh
yarn test
```

### Compile code and print an actual base64 code BOC:

```sh
yarn build
```

---

Frontend code for handling contract operations can be found [here](https://github.com/elsvv/ton-escrow-web)

One can easily use this contract live on [ton-escrow-web.vercel.app](https://ton-escrow-web.vercel.app/)
