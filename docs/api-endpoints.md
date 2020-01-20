# Remote-func API endpoints

Remote-func APIs are just JavaScript values. Endpoints are ideally pure functions that takes arguments returns values. Example of simple endpoint:

```ts
// Blog API
export const BlogApi = {
  // endpoint
  async getArticle(slug: string) {
    // logic to get article
  }
}
```

## Advanced Endpoint

Often part of the endpoint logic depends on request metadata. For permission, policies, etc. Remote-func has a function names `endpoint` that allow to read request context. Example:

```ts
import { endpoint, RequestContext } from 'remote-func/server'

export const getArticle = endpoint((ctx: RequestContext) => (slug: string)=> {
  // ctx.headers
  // ctx.method
  // ...
})
```

## Endpoint organization

Complex apps requires scalable API, so, a proper organization is important in order to scale. Grouping endpoints in modules helps on this task.

```ts
// articles.ts
export const getArticle = (slug: string) => { }
```

```ts
// comments.ts
export const getComments = (articleId: number) => { }
```

```ts
// blog-api.ts
import * as articles from './articles'
import * as comments from './comments'

export const BlogApi = {
  articles,
  comments,
}
```

It can be queried remotely like the following:

```ts
// remote function
const articleWithComments = func(async(slug: string) => {
  const { articles, comments } = BlogApi
  const article = articles.getArticle(slug)
  article.comments = comments.getComments(article.id)
  return article
})
```
