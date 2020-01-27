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

### Create Remote-func Server

Currently Remote-func only supports Express.JS web server. The first step is to install `express` as project dependency. Run `npm i express` from the root of your project.

Next, import the API created in the previous step, provided to the Remote-func `Runner`, and setup the server.

```ts
import { setupExpressServer, createRunner } from 'remote-func/server'
import { BlogApi } from './blog-api'

const app = setupExpressServer({
  path: '/',
  runner: createRunner({
    api: { BlogApi },
  }),
})

app.listen(5000)
```

That's it, now we have a Remote-func API server mounted in path `/`, and port `5000`.

### Remote functions
A remote function is a function that will be executed by a Remote-func server. Often composed by a block of requests and a block of data reductions.

```ts
// articles.ts

import { func } from 'remote-func/client'

export const getArticleWithComments = func`async (slug) => {
  // request block
  const article = await BlogApi.getArticle(slug)
  const comments = await BlogApi.getComments(article.id)

  // reduction block
  return {
    ...article,
    comments: comments,
  }
}`
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
