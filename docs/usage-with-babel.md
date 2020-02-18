# Usage with Babel and TypeScript

## Define API

```ts
// blog-api.ts
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

## Create Servers

```ts
import { setupHttpServer, createEngine } from 'remote-func/server'
import { BlogApi } from './blog-api'

const app = setupHttpServer({
  path: '/',
  engine: createEngine({
    api: { BlogApi },
  }),
})

app.listen(5000)
```

## Create client

```ts
import { createClient, createHttpHandler } from 'remote-func/client'

const client = createClient({
  handler: createHttpHandler({
    url: `http://localhost:5000/`,
    fetch: fetch as any,
  })
})
```

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

## Query your API

Queries in Remote-func are JS code that will be executed by the Remote-func engine. Often composed by a block of requests and a block of data reductions. Remote functions needs to be bound to a Remote-func client.

```ts
import { func, bind } from 'remote-func/client'

// early binding
export const getArticleWithComments = bind(client, async (slug: string) => {
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

Now `getArticleWithComments` can be used as normal function.

```ts
const articleWithComment = await getArticleWithComments('some-slug')
```
