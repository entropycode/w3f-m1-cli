#!/usr/bin/env node
// Copyright 2019-2020 Entropy Labs
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
