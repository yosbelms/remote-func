**Work in progress**

# Remote-Func
### JavaScript as the query language for your API

Remote-func allows use a subset of TypeScript/JavaScript as the query language of your APIs.

## Key features

- Twice faster than GraphQL.
- JavaScript as the query language.
- Fetch multiple resources at once.
- Allows to reduce data before sending the response to the client.
- Batch and deduplicate requests.
- Stream data from server to client in a single HTTP response, and dispatch in the order of arrival.
- End-to-end type safety when used with TypeScript.
- Independence between frontend and backend.

## Overview

Remote-func is a TypeScript library focused on developer experience. There are two primary methods of using Remote-func. The first is for plain JavaScript, the second is for use with Babel (which supports TypeScript) allowing type safety between client and server sides.

Plain JavaScript
```ts
import { func } from 'remote-func/client'

const getArticleWithComments = func`async (slug) {
  const article = await BlogApi.getArticle(slug)
  article.comments = await BlogApi.getComments(article.id)
  return article
}`

getArticleWithComments(2).then(...)
```

With Babel plugin and TypeScript
```ts
import { func } from 'remote-func/client'
import { BlogApi } from './imported-apis/api'

const getArticleWithComments = func(async (slug: string) => {
  const article = await BlogApi.getArticle(slug)
  article.comments = await BlogApi.getComments(article.id)
  return article
})

getArticleWithComments(2).then(...)
```
Using Remote-func bundled dev tools allow to take advantage of end to end type safety, and IDE intellisense. Though it is not mandatory.

## Install

```
npm i remote-func
```

## Docs

- [Usage with plain JavaScript](https://github.com/yosbelms/remote-func/blob/master/docs/usage-with-plain-js.md)
- [Usage with Babel and TypeScript](https://github.com/yosbelms/remote-func/blob/master/docs/usage-with-babel.md)
- [Remote function](https://github.com/yosbelms/remote-func/blob/master/docs/remote-function.md)
- [API endpoints](https://github.com/yosbelms/remote-func/blob/master/docs/api-endpoints.md)

MIT (c) 2019-present Yosbel Marin
