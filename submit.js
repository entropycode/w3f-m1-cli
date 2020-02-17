#!/usr/bin/env node
var http = require('http');
 
process.stdin.setEncoding("utf8");
process.stdin.on('data', function(signedExtrinsic) {
  const rpcHost = process.argv[2]
  const rpcPort = process.argv[3]

  const options = {
    host: rpcHost,
    port: rpcPort,
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }

  const req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log('BODY: ' + chunk)
    })
  })

  req.write(JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "author_submitExtrinsic",
    params: [signedExtrinsic]
  }))

  req.end()
})


