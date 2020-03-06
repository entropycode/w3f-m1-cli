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


