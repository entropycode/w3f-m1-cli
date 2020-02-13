#!/usr/bin/env node

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
    const nonce = await api.query.system.accountNonce(input.account)
    const currentBlock = await api.rpc.chain.getBlock()
    const genesisHash = await api.rpc.chain.getBlockHash(0)
    const era = api.createType('ExtrinsicEra',  { current: currentBlock.block.header.number, period: 5 })
    const runtimeVersion = await api.runtimeVersion
    const extrinsicVersion = await api.extrinsicVersion

    const unsignedExtrinsic = api.tx[input.section][input.method](...input.args)
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
        signaturePayload: signaturePayloadValue,
        toSign: u8aToHex(toSignPayload.toU8a(true)),
        unsignedExtrinsic: unsignedExtrinsic,
    }

    process.stdout.write(JSON.stringify(output))
}

main().catch(console.error).finally(() => process.exit())
