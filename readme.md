**Work in progress**

# Remote-Func
### JavaScript as the query language for your API

Remote-func allows use a subset of JavaScript as the query language of your APIs.

Example:

```ts
const getBlogEntry = bind(client, func(`async (id) => {
  const blog = await blogService.find(id)
  return {
    name: blog.name,
    content: blog.content
  }
}`))

getBlogEntry().then(...)
```

# Key features

- Twice faster than GraphQL.
- JavaScript as the query language.
- Fetch multiple resources at once.
- Allows to reduce data before sending the response to the client.
- Batch and deduplicate requests.
- Stream data from server to client in a single HTTP response, and dispatch in the order of arrival.
- End-to-end type safety when used with TypeScript.
- Independence between frontend and backend.

# Documentation

- [Overview](#overview)
- [Examples](#examples)
- [Installation](#installation)
- [Server](#server)
  - [Services](#services)
  - [HTTP server](#http-server)
- [Client](#client)
  - [HTTP client](#http-client)
  - [Query](#query)
- [Babel plugin](#babel-plugin)
  - [Configuring](#configuring)
  - [Type definition import](#type-definition-import)
  - [Query](#query)

# Overview

Remote-func is a TypeScript library focused on developer experience. There are two primary methods of using Remote-func. The first is for plain JavaScript, the second is for use with Babel (which supports TypeScript) allowing type safety between client and server sides.

# Examples

Examples can be found in [examples](tree/master/examples) directory.

- __Simple:__ Simple examples written using client AMD bundle.
- __Type safe:__ Show RemoteFunc end-to-end type safety capabilities when combined with TypeScript.
- __Secured Endpoint:__ Make use of context to add cookie based security to endpoints.

# Installation

```
npm i remote-func
```

# Server

## Services

A Remote-func service is a collection of endpoints, there is where the server logic lives. 

```ts
import { createService  } from '../server'

export const blogService = createService(ctx => ({
  async find(id: number) {
    // ...
  }
}))
```

## HTTP Server 

```ts
import express from 'express'
import { expressHandler, createEngine } from '../server'

const PORT = 5000
const app = express()

app.use('/', expressHandler({
  engine: createEngine({
    servicesPath: './services'
  })
}))

app.listen(
  PORT,
  () => console.log(`Remote func running on port ${PORT}`)
)
```

# Client

## HTTP client

```ts
import { createClient, httpHandler } from '../client'

const client = createClient({
  handler: httpHandler({
    url: 'http://localhost:5000/',
  })
})
```

## Query

Queries in Remote-func are JS code that will be executed by the Remote-func engine. Often composed by a block of requests and a block of data reductions. Remote functions needs to be bound to a Remote-func client.

```ts
const getBlogEntry = bind(client, func(`async (id) => {
  const blog = await blogService.find(id)
  return {
    name: blog.name,
    content: blog.content
  }
}`))

getBlogEntry(5).then(entry => console.log(entry))
```

## Babel plugin

Remote-func bundles a Babel plugin to allow to write queries taking advantage IDEs intellisense and type checking.

## Configuring

The Remote-func plugin must be the first plugin in your Babel config plugins list.

```json
{
  "plugins": [
    "remote-func/dev-tools/babel-plugin",
    ...otherPlugins
  ]
}
```

## Type definition import

TypeScript needs to know about your services types in order to compile. Remote-func ships a tool to extract type definitions from service source code and generate `.js` stub files to allow TypeScript validate client code.

You can achieve it by executing the following command:

```ts
npx remote-func --extract-dts --source='path/to/services.ts' --out='dts/for/client'
```

After run it you should have type descriptors(`.d.ts`) files corresponding to your API module in the specified directory. At this point you can import the services module from the client source code and write queries as if you were accessing endpoints directly from the client source code.

## Query

```ts
import { blogService } from 'path/to/blog-api'

const getBlogEntry = bind(client, func(async (id) => {
  const blog = await blogService.find(id)
  return {
    name: blog.name,
    content: blog.content
  }
}))

getBlogEntry(5).then(entry => console.log(entry))
```

> __Important:__ the code of your query can only used variables imported from endpoints types and those defined inside of the query.

# Engine

The RemoteFunc engine is the responsible of executing a query function.

```ts
import { createEngine } from 'remote-func/server'
const engine = createEngine(config)
```

MIT (c) 2019-present Yosbel Marin
