# Remote-Func
### The same language for your API

Remote-func allows to use the same laguage of front-end, and back-end, to query you APIs.

## Overview

Remote-func is focused on developer experience

A typical server has some API modules containing functions and objects. A typical client will send JavaScript functions that will run in the server side, and receives the result of that execution. Remote-func provides the mechanism by which the server and the client communicate and pass information back and forth.

## 

There are two primary methods of using Remote-func. The first is for plain JavaScript, the second is for use with Babel and Webpack.

Plain JavaScript

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




To take advantage of all features including end to end type safety it is recommended to use Remote-func bundled dev tools. Thoug it is not mandatory.


