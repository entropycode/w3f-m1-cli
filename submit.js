#!/usr/bin/env node
const { ApiPromise, WsProvider} = require ('@polkadot/api')

  process.stdin.setEncoding("utf8");
  process.stdin.on('data', async function(signedExtrinsic) {
    const wsEndpoint = process.argv[2]
    const wsProvider = new WsProvider(wsEndpoint)
    const api = await ApiPromise.create({ provider: wsProvider})

    api.rpc.author.submitAndWatchExtrinsic(signedExtrinsic, result => {
      console.log(JSON.stringify(result))
      if (result.isFinalized) {
        process.exit(0)
      } 
    })
  })


