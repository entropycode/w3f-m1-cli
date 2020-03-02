# Create Signed Transactions

This tutorial explains how to use a set of CLI tools to create a signed transaction in Substrate. There are many tutorials on building different DApps / DApp side chains with Substrate and tools such as polkadot.js to interact with a substrate node. However, as more developers build on Substrate, we want to dive into what is actually encoded in the extrinsics so that we can create them with new tools / manually, if required.

We will be using simple CLI tools to:

- [create an unsigned extrinsic and a signature payload](#create-extrinsics)
- [create a signed transaction](#create-signed-transactions)
- [submit the signed transaction](#submit-signed-extrinsics)


## Setup
Please refer to [SETUP](./SETUP) for instructions on how to setup your environment for this tutorial.

## Create Extrinsics

We start off by looking into what is being encoded in an unsigned extrinsic. To do this, we want a [simple tool](./create-extrinsic.js) `create-extrinsic.js` that takes in some data required to create an unsigned extrinsic, outputs data required for for signing in the next stage. _There are comprehensive materials on what an extrinsic is and different types of extrinsics in the [substrate.dev documentations](https://substrate.dev/docs/en/conceptual/node/extrinsics) and we will not cover it here._

```
./create-extrinsic.js [input-file-path]
```

The [example input file](./input.json)  has the following fields which are neccessary for creating a signed transaction. In this example, we want to transfer some balance from one account `5G..QY` to another account `5F..ty`s on a node running locally at port 9944.

```
{ 
    "wsEndpoint" : "ws://127.0.0.1:9944",
    "account" : "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "module" : "balances",
    "method" : "transfer",
    "args" : ["5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", 10],
    "tip" : 2
}
```

We shall use polkadot.js to create an unsigned extrinsic. _To get familiar with polkadot.js, go [here](https://polkadot.js.org/api/start/)_

```
const unsignedExtrinsic = api.tx[input.module][input.method](...input.args)
```

A hex representation of the extrinsic is obtained by `unsignedExtrinsic.toHex()`. 

```
0x94040400ff8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4828
```

Let's break this down into what is being encoded:

| Layout | Bytes | Field |  Description | Encapsulation |
|     --:|    --:|    --:|           --:|            --:| 
|        | 0x    |       |   Hex prefix |
| Compact Length |       |  |  Length prefix of the rest of the extrinsic |
|        | 94    |  Length prefix |   | [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) |
| Version |       |         | Version and signing information | |
|        | 04    | version | 1 byte; 1 high bit signed flag, 7 low bit extrinsic version | See [implementation](https://github.com/paritytech/substrate/blob/master/primitives/runtime/src/generic/unchecked_extrinsic.rs#L263) || Encoded Call |    |                    | Encoded call data |  |
|              | 04 |  Module identifier | The index of the module `Balances` within all runtime modules | Big Endian (Hex) |
|              | 00 |  Method identifier | The index of the method `transfer` within the module `Balances` | Big Endian (Hex) |
|              | ff8e...28 | Method arguments | The concatenation of the encoded arguments | [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) |

Let's look at the encoded method arguments, where the arguements are specified in the [balances module](https://github.com/paritytech/substrate/blob/pre-v2.0-3e65111/frame/balances/src/lib.rs#L453):

| Arguments Field | Bytes |  Description |
|            --:  |    --:|           --:| 
| Destination Account | ff   | [Account format indicator](#account-format-indicator) |
| Destination Account | 8eaf...26a48 | Public key from provided address in [SS58 address format](https://substrate.dev/docs/en/overview/ss58-address-format) |
| Value               | 28  | Value of transfer [Compact encoded](https://substrate.dev/docs/en/conceptual/core/) |


**What is happening behind the scenes?**

An instance of polkadot.js API is initialised with the metadata from a node, provided or with a provider to a substrate node.  Along with chain data and runtime data, a key role of the metadata is to allow the instance to have the information to index the modules, methods and the types required for encoding the arguments, that are the last 3 fields in the above `unsignedExtrinsic`. 

#### Metadata

We require the metadata in our next step to create the signed transaction without connections to the node, for more details on metadata, [see details here](https://polkadot.js.org/api/start/basics.html#metadata). 

```
const metadata = await api.rpc.state.getMetadata()
```

#### Signed Extension Data

In order to create a signed transaction, we will need to add a signature, the signer's address and some other information to the above `unsignedExtrinsic`. 

There are additional information in the extrinsic payload that is required to be signed and is not explicitly in the extrinsic, such as `genesisHash`, `blockHash` _(for mortal transactions)_, etc. Details can be found [here](https://polkadot.js.org/api/start/extrinsic.extend.html#extensions). 

In our tool, we will create the payload with data from the input file and the node. 

```
const signaturePayloadValue = {
  address: input.account,
  blockHash: currentBlock.block.header.hash.toHex(), 
  genesisHash: genesisHash.toHex(),
  nonce: nonce.toHex(),
  method: '0x' + methodIndex + callData,
  era: era.toHex(), 
  tip: input.tip,
  version: extrinsicVersion,
  specVersion: runtimeVersion.specVersion,
}

// In polkadot.js the signed extension type is called ExtrinsicPayload
const toSignPayload = api.createType('ExtrinsicPayload',  signaturePayloadValue, {version: signaturePayloadValue.version})
```

Similar to the `unsignedExtrinsic`, we can get the hex code `toSignPayload.toHex()` and it is a concatenation of encoded fields. 

```
0x900400ff8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a482832000008010000003ded6a14293f500687b357386c9fc9c3e93da3b1f3ed84cefcd8209519ca5a31049dcb30b4e117c26fd2e6dfea2c1b8221fd3b0bf912033bb1857ef1db3042b2
```

|Layout | Byte | Field | Description | Encapsulation |
|                    --:|   --:|    --:|          --:|            --:|
|                       | 0x   |       |   Hex prefix |              |
| Compact Length        |      |       |  Length prefix of the rest of the extrinsic |
|                       | 90   | Length Prefix | | [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) | 
| Encoded Call          |      |       |  Encoded call data | | 
|              | 04 |  Module identifier | The index of the module `Balances` within all runtime modules | Big Endian (Hex) |
|              | 00 |  Method identifier | The index of the method `transfer` within the module `Balances` | Big Endian (Hex) |
|              | ff8e...28 | Method arguments | The concatenation of the encoded arguments |  [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec)
| Extension Data |      |      | Message to be signed | | 
|                       | 3200 |  Transaction Era | The period defined for moratal transaction to be valid | See [implementation](https://github.com/paritytech/substrate/blob/master/primitives/runtime/src/generic/era.rs#L58) | 
|           | 08      |  Transaction Index | Signer's acccount nonce |  [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) |
|           | 08      |  Tip | Optional; higher tip increase priority of the transaction | [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) |
| | 01000000| Runtime Spec Version |  Current runtime spec version to ensure signing for the intended runtime logic | [4 bytes in hex](https://github.com/paritytech/substrate/blob/master/primitives/version/src/lib.rs#L77)|
| | 3d.. 31 | Genesis Blockhash|  Genesis blockhash of the current chain to signing for the intended chain |  See [declared storage](https://github.com/paritytech/substrate/blob/master/frame/system/src/lib.rs#L330)
| | 04.. b2 | Current Blockhash | Current blockhash when signed, for mortal transactions. Same as Genesis blockhash for immortal transactions | See [declared storage](https://github.com/paritytech/substrate/blob/master/frame/system/src/lib.rs#L330)

**NOTE:** Ensure you are using `toSignPayload.toU8a(true)` to create the payload without the length prefix to be signed. 

#### Output

Now we have all the required information to be signed, we shall output it to the next stage. 
```
const output = {
    metadata: metadata.toHex(),
    signaturePayload: toSignPayload.toHex(),
    toSign: u8aToHex(toSignPayload.toU8a(true)),
    unsignedExtrinsic: unsignedExtrinsic.toHex(),
}
```

## Create Signed Transactions

We will sign the payload and create a signed transaction in this section with the following [CLI tool](./create-signed-transaction.js): `create-signed-transaction.js`. It will be taking in the output from [create-extrinsic .js](./create-extrinsic.js). This tool will not be connecting to a node since we have prepared all the required data in our previous step.

```
./create-extrinsic.js [input-file-path] | ./create-signed-transaction.js [signature-type] [private-key]
```

There are multiple ways to sign the extrinsic payload, here we use the polkadot.js [Keyring](https://polkadot.js.org/api/start/keyring.html).

```
const keyring = new Keyring({ type: scheme })
const keypair = keyring.addFromUri(secret)
const signature = keypair.sign(input.toSign);
```

The signature is 64 bytes, and it will need to be prefixed by the type of signature as specified at the command line as multiple types are [supported](https://github.com/paritytech/substrate/blob/pre-v2.0-3e65111/primitives/runtime/src/lib.rs#L174). 

```
const signatureTypes = { 'ed25519' : '0x00', 'sr25519' : '0x01', '0x02' : 'edcsa'} 
const multiSignature = signatureTypes[scheme] + Buffer.from(signature).toString('hex')
```

With the signature ready, we can use the method [addSignature](https://polkadot.js.org/api/types/classes/_primitive_extrinsic_extrinsic_.extrinsic.html#addsignature) to add it into the unsigned extrinsic to created a signed transaction. To create an extrinsic javascript object from the unsigned extrinsic hex input, we need to attach the metadata information to the type registry so that the hex can be decoded / encoded correctly.
```
const registry = new TypeRegistry()
new Metadata(registry, input.metadata)

const unsignedExtrinsic = createType(registry, 'Extrinsic', input.unsignedExtrinsic)
const signedExtrinsic = unsignedExtrinsic.addSignature(keypair.publicKey, multiSignature, input.signaturePayload)
```

The `signedExtrinsic` hex encodes the following information:

| Layout | Bytes | Field |  Description | Encapsulation |
|     --:|    --:|    --:|           --:|            --:|
|        | 0x    |       |   Hex prefix |               |
| Compact Length | |  |  Length prefix of the rest of the extrinsic | |
|        | 2d02  | Length prefix  |     |[Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec)|
| Version |      |      | Version and signing information | |
|        | 84    | version | 1 byte; 1 high bit signed flag, 7 low bit extrinsic version | See [implementation](https://github.com/paritytech/substrate/blob/master/primitives/runtime/src/generic/unchecked_extrinsic.rs#L263) |
| Signer |       |       | Signer's Identifier | | 
|        | ff    | Account format |  | See [Account format indicator](#account-format-indicator) | 
|        | d4..7d| Public key    |  | [SS58 address format](https://substrate.dev/docs/en/overview/ss58-address-format) |
| Signature |    |      | Signature type prefix | | 
|           | 01 |  Type prefix | For identifying signature in MultiSignature |  [MultiSignature Enum](https://github.com/paritytech/substrate/blob/pre-v2.0-3e65111/primitives/runtime/src/lib.rs#L174) |
|           | 3e..81 | Signature | 64 bytes signature from signing the Signed Extension | See [Substrate Cryptography](https://substrate.dev/docs/en/conceptual/cryptography/#public-key-cryptography)|
| Signed Extension Data |   |   | Message to be signed | | 
|           | 3200    |  Transaction Era | The period defined for moratal transaction to be valid | See [implementation](https://github.com/paritytech/substrate/blob/master/primitives/runtime/src/generic/era.rs#L58) | 
|           | 08      |  Transaction Index | Signer's acccount nonce |  [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) |
|           | 08      |  Tip | Optional; higher tip increase priority of the transaction | [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec) |
| Encoded Call |    |                    | Encoded call data | |
|              | 04 |  Module identifier | The index of the module `Balances` within all runtime modules | Big Endian (Hex) |
|              | 00 |  Method identifier | The index of the method `transfer` within the module `Balances` | Big Endian (Hex) |
|              | ff8e...28 | Method arguments | The concatenation of the encoded arguments |  [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec)

##### Account format indicator

1/3/5/9/33 bytes: The signing account identity, in `Address` format:
  - 0...0xef: 1 byte Account Index, to be interpreted as the value of the byte.
  - 0xfc: 2 byte Account Index, value to follow.
  - 0xfd: 4 byte Account Index, value to follow.
  - 0xfe: 8 byte Account Index, value to follow.
  - 0xff: 32 byte Account ID, value to follow.

Some transaction specific fields (`era`, `nonce`, `tips`), the signer's account identifier and the signature are the fields added to an unsigned extrinsic to create a signed transaction, along with a new length prefix. All the transaction specific information neccessary to create a signed transaction is given in an extrinsic payload. Therefore, it is possible to manually create a signed transaction with the extrsinsic payload and a tool that returns the length prefix. 

## Submit signed extrinsics

Now that we have the signed transaction, we can submit it to the substrate node with the rpc [author](https://github.com/paritytech/substrate/tree/master/client/rpc/src/author) section. We can do this simply by piping the signed extrinsic into [sumbit.js](./submit.js). 

```
./create-extrinsic.js [input-file-path] | ./create-signed-transaction.js [signature-scheme] [private-key]  | ./submit.js [host] [port]
```
