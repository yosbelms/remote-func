# Query functions

Query functions are `async` functions written in JavaScript that will be executed in a Remote-func engine. This bring new possibilities to front-end, and backend developers allowing the front-end to evolve with more independency from the back-end. Query functions can be compared to PostgreSQL `DO` statement, and Redis `eval`. 

Query functions are very restrictive because security reasons. These must be `async` functions, and only have access to endpoints and the following read only globals:

- Promise
- Object
- Date
- Array
- Number
- String

# Cfunc

Cfunc is inspired by Linux `cgroups`. This is the tool that allow to run safe JavaScript in server side. Cfunc transpiles the query source code transforming it in a safe runnable code.

# Execution runtime

Queries source code is transpiled so the code execution can be supervised by a runtime that watches execution time and memory allocation, restricting that query to only use the configured amount of time and memory.

# Endpoint isolation

Endpoints are wrapped with ES proxies. The values returned by Endpoints will be deep-cloned. The clone process supports a limited set of JS types, those are:

- [Primitive Values](https://developer.mozilla.org/en-US/docs/Glossary/Primitive)
- Object
- Array
- Date
- Promise(Thenables in general)

Any other type not included in the previous list will be ignored. For example, if an endpoint returns a function, it will be ignored during the cloning process, returning `undefined`.  

Example:
```ts
// API
const api = {
  getBook: () => ({
    name: 'John',
    getName() {
      return this.name
    }
  })
}

// correct remote function
const rf1 = func(`async() => (await getBook()).name`)

// remote function with error
const rf2 = func(`async() => (await getBook()).getName()`)
```
