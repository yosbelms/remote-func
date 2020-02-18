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
  // ctx.request
  // ctx.response
  // ...
})
```

## API endpoint return type

All values returned by endpoints are deep cloned (API Isolation in remote-func docs). Hence, function values are not removed from the final result. To avoid TypeScript false positives, there is a generic type names `Result` to cover the correct type transformation of cloned endpoint returned values. Example:

```ts
import { Result } from 'remote-func/server'

class User {
  name: string
  getName() {
    return this.name
  }
}

const MyApi = {
  getUser(): Result<User> {
    return new User()
  }
}
```

In that way, when use `MyApi.getUser` from Remote-func client, the `getName` method will be inexistent for TypeScript.
