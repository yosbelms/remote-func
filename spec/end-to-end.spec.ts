import 'jasmine'
import { createEngine, expressHandler, microHandler, Result, Engine } from '../server'
import { createClient, httpHandler, func, bind, engineHandler } from '../client'
import { createService, instantiateApi, createApi } from '../server/api'
import fetch from 'node-fetch'

import express from 'express'
const micro = require('micro')

const PORT = 7000

const mutateContextMiddleware = (ctx: any, next: Function) => {
  ctx.newProp = 1
  return next()
}

const api = createApi({
  service: createService((ctx: any) => ({
    mutateContext: () => ctx.newProp,
    one: (): Result<number> => 1,
    newDate: (): Result<Date> => new Date(),
  }))
})

const servers: any = {
  // ExpressJS
  express: {
    server: void 0 as any,
    beforeAll(done: any) {
      const app = express()
      const engine = createEngine({
        api,
        middlewares: [mutateContextMiddleware]
      })
      app.use('/', expressHandler(engine))
      this.server = app.listen(PORT, done)
    },
    afterAll(done: any) {
      this.server.close(done);
    }
  },
  // Micro
  micro: {
    server: void 0 as any,
    beforeAll(done: any) {
      const engine = createEngine({
        api,
        middlewares: [mutateContextMiddleware]
      })
      this.server = micro(microHandler(engine))
      this.server.listen(PORT, done)
    },
    afterAll(done: any) {
      this.server.close(done)
    }
  }
}

describe('End to End:', () => {
  Object.keys(servers).forEach((name) => {
    const server = servers[name]
    describe(name, () => {
      beforeAll(server.beforeAll.bind(server))

      it('should execute functions in the server', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: fetch as any,
          })
        })
        const rFunc = bind(client, func(`async () => service.one()`))

        expect(await rFunc()).toBe(instantiateApi(api).service.one())
      })

      it('should execute functions in the server', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: fetch as any,
          })
        })
        const rFunc = bind(client, func(`async () => service.mutateContext()`))

        expect(await rFunc()).toBe(1)
      })

      it('should execute functions in the server using GET', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: (url: string, { headers, body }) => {
              return fetch(`${url}?requests=${encodeURIComponent(body)}`, { method: 'GET', headers })
            },
          }),
        })
        const rFunc = bind(client, func(`async () => service.one()`))

        expect(await rFunc()).toBe(instantiateApi(api).service.one())
      })

      afterAll(server.afterAll.bind(server))
    })
  })
})

describe('Engine Handler', () => {
  let engine: Engine | void
  beforeAll((done) => {
    engine = createEngine({
      api,
      middlewares: [mutateContextMiddleware]
    })
    done()
  })

  it('should communicate', async () => {
    const client = createClient({
      handler: engineHandler(engine as Engine)
    })
    const rFunc = bind(client, func(`async () => service.one()`))
    expect(await rFunc()).toBe(instantiateApi(api).service.one())
  })

  afterAll(() => {
    engine = void 0
  })
})
