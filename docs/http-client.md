# Http Client

The communication between Remote-func client and server is through HTTP.

```ts
import { createClient } from 'remote-func/client'

const client = createClient({
  url: 'http://remote-func-server',
  functions: [
    // registered functions
  ],
})
```

## Batching

Batching allows to obtain the result of many function call in one HTTP call. The server will stream back the results as they are resolved. If the browser supports WebStreams, the HTTP client will resolve each function as soon as each result arrives. If the browser doesn't support WebStream all the functions will resolve when all responses arrived.

```ts
client.useBatch(true)

someRemoteFunc1()
someRemoteFunc2()
someRemoteFunc3()

client.flush()
```

`someRemoteFunc1`, `someRemoteFunc2`, and `someRemoteFunc3` will be executed in one batch request.
