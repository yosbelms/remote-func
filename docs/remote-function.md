# Remote functions

Remote functions are `async` functions that will be executed in a Remote-func server. They are devised to be more like a procedure that a query, this open new possibilities to front-end, and backend developers allowing the front-end to evolve with more independency from the back-end. Remote functions can be compared to PostgreSQL `DO` statement, and Redis `eval`. 

Remote functions are very restrictive because security reasons. These must be `async` functions, and can only run what exposed by the Remote-func server. Native classes can be called as functions, but can no be used with the `new` operator, Also all its static methods are accessible, example: `new Date()` will throw an error, but `Date()` will work as expected, also `Date.now()`. Only a limited set of native classes are allowed to use inside a remote function. These are:

- Promise
- Object
- Date
- Array
- Number
- String

# API isolation

APIs are wrapped in ES proxies. The values returned by API functions will be deep-cloned. The clone process supports a limited set of JS types, those are:

- [Primitive Values](https://developer.mozilla.org/en-US/docs/Glossary/Primitive)
Object
Array
Date
Promise(Thenables in general)

Any other type not included in the previous list will be ignored. So, if an API method that returns a function is called, it wll be ignored during the cloning process, returning `undefined`.  

Example:
```ts
// API
const api = {
  getBook: () =>({
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