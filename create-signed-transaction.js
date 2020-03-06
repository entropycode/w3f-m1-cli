#!/usr/bin/env node
// Copyright © 2019-2020 Entropy Labs

const {Keyring} = require ('@polkadot/api')
const {TypeRegistry, createType, Metadata} = require ('@polkadot/types');

process.stdin.setEncoding("utf8");
process.stdin.on('data', function(data) {
  const scheme = process.argv[2]
  const secret = process.argv[3]
  const input = JSON.parse(data)

  const keyring = new Keyring({ type: scheme })
  const keypair = keyring.addFromUri(secret)
  const signature = keypair.sign(input.toSign)
  const signatureTypes = { 'ed25519' : '0x00', 'sr25519' : '0x01', '0x02' : 'edcsa'} 
  const multiSignature = signatureTypes[scheme] + Buffer.from(signature).toString('hex')

  const registry = new TypeRegistry()
  new Metadata(registry, input.metadata)

  const unsignedExtrinsic = createType(registry, 'Extrinsic', input.unsignedExtrinsic)
  
  const signedExtrinsic = unsignedExtrinsic.addSignature(keypair.publicKey, multiSignature, input.signaturePayload)

  process.stdout.write(signedExtrinsic.toHex())
  process.exit(0)
})
