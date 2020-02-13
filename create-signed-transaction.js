#!/usr/bin/env node
const { ApiPromise, WsProvider, Keyring} = require ('@polkadot/api')
const {cryptoWaitReady} = require('@polkadot/util-crypto')
const path = require("path")
const fs = require("fs")

process.stdin.on('data', async function(data) {
  const curveTypes = { 'ed25519' : '0x00', 'sr25519' : '0x01', '0x02' : 'edcsa'} 
  const curve = process.argv[2]
  const secret = process.argv[3]
  const inputFile = process.argv[4]
  const params = fs.readFileSync(path.resolve(__dirname, inputFile));
  const input = JSON.parse(data)
  await cryptoWaitReady();
  const keyring = new Keyring({ type: curve })
  const keypair = keyring.addFromUri(secret)
  const signature = keypair.sign(input.toSign);

  const wsProvider = new WsProvider(params.wsEndpoint)
  const api = await ApiPromise.create({ provider: wsProvider})
  
  const extrinsicPayload = api.createType('ExtrinsicPayload', input.signaturePayload, {version: input.signaturePayload.version})
  const unsignedExtrinsic = api.createType('Extrinsic', input.unsignedExtrinsic, {version: input.signaturePayload.version})
  const multiSignature = api.createType('MultiSignature', curveTypes[curve] + Buffer.from(signature).toString('hex'))

  let signedExtrinsic = unsignedExtrinsic.addSignature(input.signaturePayload.address, multiSignature, extrinsicPayload)

  process.stdout.write(signedExtrinsic.toHex())
  process.exit(0)
})
