# Usage with Babel

This document will focus on the usage with Babel and TypeScript, for usage with plain JavaScript refer to [Usage with plain JavaScript](usage_with_plain_js.md)

## Creating Remote-func API

Let's get started by creating the API. In Remote-func the entry point of an API is a JavaScript module, and an endpoint is just a JavaScrip function. The API module format consist in two parts, the `default` exported API module declaration, and the exported API, example:
```ts
// blog-api.ts
import { declareApiModule } from 'remote-func/server'
export default declareApiModule('BlogApi')
export const BlogApi = {
  // api methods here
  async getArticle(slug: string) {
    // ... find article
  },
  async getComments(articleId: string) {
    // ... find comments
  }
}
```

The `declareApiModule` function receives the name of the exported JavaScript value that conforms the root of your API.

## Create Remote-func Server

Currently Remote-func only supports Express.JS web server. The first step is to install `express` as project dependency. Run `npm i express` from the root of your project.

Next, import the api created in the previous step, and setup the server. API modules needs to be imported entirely by using `import * as ...`

```ts
import { setupExpressServer, createRunner } from 'remote-func/server'
import * as blogApiModule from './blog-api'

const app = setupExpressServer({
  path: '/',
  runner: createRunner({
    apiModule: blogApiModule,
  }),
})

app.listen(5000)
```

That's it, now we have created a Remote-func API server mounted in path `/`, and port `5000`.

## Create Remote-func Client

**Configure Babel Plugin**

In order to take advantage of IDE intellisense, and type safety, it is necessary to setup the bundled Babel plugin located at `remote-func/dev-tools/babel-plugin`. See [Babel docs](https://babeljs.io/docs/en/plugins/#plugin-preset-paths) for how to setup plugins properly.

**Import API d.ts**

TypeScript needs to know about your API types to compile. Remote-func ships a tool to extract type definitions an generate `.js` stub files to allow TypeScript validate client code.

Start by creating a `.js` or a `.ts`(if you are using `ts-node`) anywhere in your project with the following content:

```ts
import { importApiModuleDts } from 'remote-func/dev-tools/import-api-dts'
importApiModuleDts('path/to/blog-api.ts', 'path/to/client/destination/dir/')
```

After run it using `node` CLI, you should have type descriptors(`.d.ts`) files corresponding your API module in the specified directory. At this point you can import the API module from the client.

### Remote functions

A remote function is a function that will be executed by a Remote-func server. Often composed by a block of requests and a block of data reductions.

```ts
// articles.ts

import { func } from 'remote-func/client'
import { BlogApi } from 'path/to/destination/dir/blog-api'

export const getArticleWithComments = func(async (slug: string) => {
  // request block
  const article = await BlogApi.getArticle(slug)
  const comments = await BlogApi.getComments(article.id)
  // reduction block
  return {
    ...article,
    comments: comments,
  }
})
```

Remote functions needs to be bound to a Remote-func client.

**Create client**

```ts
import { createClient } from 'remote-func/client'
import { getArticleWithComments } from './articles'

createClient({ url: 'http://localhost:5000/' }).bind([
  getArticleWithComments
])
```

Also can bind all the remote functions exported by a module, using the spread operator, this is a convenient way that will only bind remote functions existing in the module, and ignore the rest.

```ts
import * as articles from './articles'
createClient().bind([
  ...articles
])
```

Now you are ready to query your API using a remote function, example:

```ts
import { getArticleWithComments } from './articles'
getArticleWithComments('some-slug').then(data => {
  console.log(data)
})
```
