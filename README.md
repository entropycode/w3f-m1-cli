# Create Signed Transactions

This tutorial explains how to use a set of CLI tools to create a signed transaction in Substrate. There are many tutorials on building different DApps / DApp side chains with Substrate and tools such as polkadot.js to interact with a substrate node. However, as more developers build on Substrate, we want to dive into what is actually encoded in the extrinsics so that we can create them with new tools /  manually, if required.

 We will be using simple CLI tools to:

- [create an unsigned extrinsic and a signature payload](#create-extrinsics)
- [create a signed transaction](#create-signed-transactions)
- [submit the signed transaction](#submit-signed-extrinsics)

Before we begin, we have prepared a simple pallet, Feedback, to add to our runtime and we will be interacting with it. Details can be found [on github]()

## Create Extrinsics

We start off by looking into what is being encoded in an unsigned extrinsic. To do this, we want a [simple tool](./create-extrinsic.js) `create-extrinsic.js` that takes in some data required to create an unsigned extrinsic, outputs data required for for signing in the next stage. _There are comprehensive materials on what an extrinsic is and different types of extrinsics in the [substrate.dev documentations](https://substrate.dev/docs/en/conceptual/node/extrinsics) and we will not cover it here._

```
./create-extrinsic.js [input-file-path]
```

The [example input file](./input.json)  has the following fields which are neccessary for creating a signed transaction. In this example, we want to create a new poll in our feedback pallet on a node running locally at port 9944. We are going to be signing with the account with SS58 address `5G..QY`

```
{ 
  "wsEndpoint" : "ws://127.0.0.1:9944",
  "account" : "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "section" : "feedback",
  "method" : "poll",
  "args" : ["Poll Title", ["option1", "option2"], 120],
  "tip" : 2
}
```

We shall use polkadot.js to create an unsigned extrinsic. _To get familiar with polkadot.js, go [here](https://polkadot.js.org/api/start/)_

```
const unsignedExtrinsic = api.tx[input.section][input.method](...input.args)
```

A hex representation of the extrinsic is obtained by `unsignedExtrinsic.toHex()`. Let's break this down into what is being encoded:

| code |  encoded |
|  --:|    --:| 
| 0x  |  hex prefix|
| 90  |  Length prefix of the rest of the extrinsic - [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 04 |  Version information; 1 high bit signed flag, 7 low bit extrinsic version (e.g. 84 is signed extrinsic V4, 04 is unsigned extrinsic V4)
| 06 |  Section identifier; the index of the section within all sectionss
| 00 |  Method identifier; the index of the method within the section 
| 14...00 | Method arguments; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) 

**What is happening behind the scenes?**

When an instance of polkadot.js API is connected to the substrate node, it initialises by retrieving the metadata.  Along with chain data and runtime data, a key role of the metadata is to allow the instance to have the information to index the section (Pallet), methods and the types required for encoding the arguments, the last 3 fields in the above `unsignedExtrinsic`. 

#### Metadata

We require the metadata in our next step to create the signed transaction without connections to the node, for more details on metadata, [see details here](https://polkadot.js.org/api/start/basics.html#metadata). 

```
const metadata = await api.rpc.state.getMetadata()
```

#### Extrinsic Payload

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

const toSignPayload = api.createType('ExtrinsicPayload',  signaturePayloadValue, {version: signaturePayloadValue.version})
```

Similar to the `unsignedExtrinsic`, we can get the hex code `toSignPayload.toHex()` and it is a concatenation of encoded fields. 

| code |  encoded |
|  --:|   --:| 
| 0x  |   hex prefix|
| 8c  |  Length prefix (omitted when it is to be signed) - [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 06 |  Section identifier; the index of the section within all sectionss
| 00 |  Method identifier; the index of the method within the section 
| 14...00 |  Method arguments; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers)
| 0200    |  Transaction Era; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) | 
| 9c      |  Acccount nonce; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 08      |  Tip; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 01000000|  Runtime spec version (to confirm) |
| f2.. 07 |  Genesis blockhash | 
| 4d.. 2b |  Current blockhash |


**NOTE:** Ensure you are using `toSignPayload.toU8a(true)` to create the payload without the length prefix to be signed. 

#### Output

Now we have all the required information to be signed, we shall output it to the next stage. 
```
const output = {
  metadata: metadata,
  signaturePayload: signaturePayloadValue,
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
const keyring = new Keyring({ type: curve })
const keypair = keyring.addFromUri(secret)
const signature = keypair.sign(input.toSign);
```

The signature is 64 bytes, and it will need to be prefixed by the type of signature as specified at the command line as multiple types are supported. 

```
const curveTypes = { 'ed25519' : '0x00', 'sr25519' : '0x01', '0x02' : 'edcsa'} 
const multiSignature = curveTypes[curve] + Buffer.from(signature).toString('hex')
```

With the signature ready, we can use the method [addSignature](https://polkadot.js.org/api/types/classes/_primitive_extrinsic_extrinsic_.extrinsic.html#addsignature) to add it into the unsigned extrinsic to created a signed transaction. To create an extrinsic javascript object from the unsigned extrinsic hex input, we need to attach the metadata information to the type registry so that the hex can be decoded / encoded correctly.
```
const registry = new TypeRegistry()
new Metadata(registry, input.metadata)

const unsignedExtrinsic = createType(registry, 'Extrinsic', input.unsignedExtrinsic)
const signedExtrinsic = unsignedExtrinsic.addSignature(keypair.publicKey, multiSignature, input.signaturePayload)
```

The `signedExtrinsic` hex encodes the following information:

| code |  encoded |
|  --:|   --:| 
| 0x  |   hex prefix|
| 2902  |  Length prefix; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 84 |  Version information; 1 high bit signed flag, 7 low bit extrinsic version (e.g. 84 if signed extrinsic V4) 
| ff | Signing account address format |
| d4..7d | Account public key (depending on previous address format) |
| 01 | Signature type prefix |
| 3e..81 | 64 bytes signature |
| 0200    |  Transaction Era; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) | 
| 9c      |  Acccount nonce; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 08      |  Tip; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers) |
| 06 |  Section identifier; the index of the section within all sectionss
| 00 |  Method identifier; the index of the method within the section 
| 14...00 |  Method arguments; [Compact encoded](https://substrate.dev/docs/en/conceptual/core/codec#compactgeneral-integers)

_Signing account format_

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
./create-extrinsic.js [input-file-path] | ./create-signed-transaction.js [signature-type] [private-key]  | ./submit.js [host] [port]
```
