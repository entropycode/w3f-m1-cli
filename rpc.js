const submitExtrinsic = (endpoint, params) =>  {
  return new Promise((res, rej) => {

    let request = new Request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "author_submitExtrinsic",
        params: params
      }),
      headers: { "Content-Type": "application/json" }
    })

    fetch(request).then(response => {
      if (response.status === 200) {
        res (response.json())
      } else {
        rej("Something went wrong on api server!")
      }
    })
    .catch(error => {
        console.error(error);
        rej(err)
    })
    
  })

}


module.exports = {
  submitExtrinsic
}