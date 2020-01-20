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

In order to take advantage of IDE intellisense, and type safety, it is necessary to setup the bundled Babel plugin located at `remote-func/dev-tools/babel-plugin`. See [Babel docs](https://babeljs.io/docs/en/plugins/#plugin-preset-paths) for how to use plugins.

**Import API d.ts**

Create a `.js` or a `.ts`(if you are using `ts-node`) anywhere in your project with the following content:

```ts
import { importApiModuleDts } from 'remote-func/dev-tools/import-api-dts'
importApiModuleDts('path/to/blog-api.ts', 'path/to/destination/dir/')
```

After run it using `node` CLI, you should have type descriptors(`.d.ts`) files corresponding your API module. At this point you can import the exported value of the API module from the client side, let's continue.

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

Remote functions needs to be registered in a Remote-func client make it work.

**Create client**

```ts
import { createClient } from 'remote-func/client'
import * as articles from './articles'

createClient({
  url: 'http://localhost:5000/',
  functions: [
    articles.getArticleWithComments
  ]
})
```

Also you can spread the entire module into `functions`, this is a convenient way that will only register remote functions existing in the module, and ignore the rest.

```ts
import * as articles from './articles'
createClient({
  functions: [
    ...articles
  ]
})
```

Now you are ready to query your API using a remote function, example:

```ts
import { getArticleWithComments } from './articles'
getArticleWithComments('some-slug').then(data => {
  console.log(data)
})
```
