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
