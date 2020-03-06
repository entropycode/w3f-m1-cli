#!/usr/bin/env node
// Copyright © 2019-2020 Entropy Labs

const { ApiPromise, WsProvider} = require ('@polkadot/api')
const { u8aToHex } = require ('@polkadot/util')
const path = require("path")
const fs = require("fs")


async function main() {
    const inputFile = process.argv[2]
    const file = fs.readFileSync(path.resolve(__dirname, inputFile));
    const input = JSON.parse(file)

    const wsProvider = new WsProvider(input.wsEndpoint)
    const api = await ApiPromise.create({ provider: wsProvider})

    const metadata = await api.rpc.state.getMetadata()
    
    const nonce = await api.query.system.accountNonce(input.account)
    const currentBlock = await api.rpc.chain.getBlock()
    const genesisHash = await api.rpc.chain.getBlockHash(0)
    const era = api.createType('ExtrinsicEra',  { current: currentBlock.block.header.number, period: 5 })
    const runtimeVersion = await api.runtimeVersion
    const extrinsicVersion = await api.extrinsicVersion

    const unsignedExtrinsic = api.tx[input.module][input.method](...input.args)
    const methodIndex = Buffer.from(unsignedExtrinsic.callIndex).toString('hex')
    const callData = Buffer.from(unsignedExtrinsic.data).toString('hex')
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
    
    const output = {
        metadata: metadata.toHex(),
        signaturePayload: toSignPayload.toHex(),
        toSign: u8aToHex(toSignPayload.toU8a(true)),
        unsignedExtrinsic: unsignedExtrinsic.toHex(),
    }

    process.stdout.write(JSON.stringify(output))
}

main().catch(console.error).finally(() => process.exit())
