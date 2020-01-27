>**Not ready for production**

# Remote-Func
### JavaScript as the query language for your API

Remote-func allows use TypeScript/JavaScript as the query language of your APIs.

## Overview

Remote-func is focused on developer experience. There are two primary methods of using Remote-func. The first is for plain JavaScript, the second is for use with Babel (which supports TypeScript) allowing type safety between client and server sides.

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
