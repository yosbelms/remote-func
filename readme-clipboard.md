
Server
```ts
import express from 'express'

// declare API
const api = {
  sum(a, b) {
    return a + b
  },
  sqrt(a) {
    return a ** 2
  },
}

// create server
const app = express()

// setup server
setupServer({
  app,
  express,
  runner: createRunner({ api })
})

// launch
app.listen(5000)

```

Client
```ts
import { func } from 'remote-func'
import { Client } from 'remote-func/http-client'

const client = new Client({ url: 'http://localhost:5000' })

// declare server side function
const sumAndSqrt = func`async (a, b) {
  const s = await sum(a, b)
  return await sqrt(s)
}`

client.register([sumAndSqrt])

// execute
sumAndSqrt(2).then(result => {
  console.log(result)
})
```

With Babel plugin and TypeScript

API module
```ts
// api.ts
import { declareApiModule } from 'remote-func'

// declare API module
export default declareApiModule('MyApi')
export const MyApi = {
  sum(a, b) {
    return a + b
  },
  sqrt(a) {
    return a ** 2
  },
}
```

Server
```ts
import { createRunner } from 'remote-func'
import { setupServer } from 'remote-func/http-server'
import express from 'express'
// import the whole module
import * as apiModule from './api'

const app = express()

setupServer({
  app,
  express,
  runner: createRunner({ apiModule })
})

app.listen(5000)
```

Client
```ts
import { func } from 'remote-func'
import { Client } from 'remote-func/http-client'
import { MyAapi } from './imported-apis/api'

const client = new Client({ url: 'http://localhost:5000' })

// declare server side function
const sumAndSqrt = func(async (a, b) => {
  const s = await MyAapi.sum(a, b)
  return await MyAapi.sqrt(s)
})

client.register([sumAndSqrt])

// execute
sumAndSqrt(2).then(result => {
  console.log(result)
})
```
