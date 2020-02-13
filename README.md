**Usage**


*Create signed transactions*
```
./create-extrinsic.js input.json | ./create-signed-transaction.js sr25519 0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a input.json
```

*Create signed transactions and submit to a ws endpoint*
```
./create-extrinsic.js input.json | ./create-signed-transaction.js sr25519 0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a input.json | ./submit.js ws://127.0.0.1:9944
```