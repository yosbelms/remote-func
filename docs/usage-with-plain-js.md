## Usage with plain JavaScript

### Creating Remote-func API

Let's get started by creating the API. In Remote-func, and the exported API, example:

```ts
// blog-api.js
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

### Create Server

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

## Query your API

Queries in Remote-func are JS code that will be executed by the Remote-func engine. Often composed by a block of requests and a block of data reductions. Remote functions needs to be bound to a Remote-func client.

```ts
import { func, bind } from 'remote-func/client'

// early binding
export const getArticleWithComments = bind(client, func`async (slug) => {
  // request block
  const article = await BlogApi.getArticle(slug)
  const comments = await BlogApi.getComments(article.id)

  // reduction block
  return {
    ...article,
    comments: comments,
  }
}`)
```

Now `getArticleWithComments` can be used as normal function.

```ts
const articleWithComment = await getArticleWithComments('some-slug')
```
