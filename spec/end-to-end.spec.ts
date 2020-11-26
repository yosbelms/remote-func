import 'jasmine'
import { createEngine, expressHandler, microHandler, Result, Engine } from '../server'
import { createClient, httpHandler, func, bind, engineHandler } from '../client'
import { createService, instantiateServices } from '../server/service'
import fetch from 'node-fetch'

import express from 'express'
const micro = require('micro')

const PORT = 7000

const context = (ctx: any) => {
  ctx.newProp = 1
  return ctx
}

const services = {
  service: createService((ctx: any) => ({
    mutateContext: () => ctx.newProp,
    one: (): Result<number> => 1,
    newDate: (): Result<Date> => new Date(),
    identity: (x: any) => x,
  }))
}

const servers: any = {
  // ExpressJS
  express: {
    server: void 0 as any,
    beforeAll(done: any) {
      const app = express()
      const engine = createEngine({
        services,
        context,
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
        services,
        context,
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

        expect(await rFunc()).toBe(instantiateServices(services).service.one())
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

      it('should pass params', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: fetch as any,
          })
        })
        const rFunc = bind(client, func(`async (x) => service.identity(x)`))

        expect(await rFunc(5)).toBe(5)
        expect(await rFunc(6)).toBe(6)
      })

      it('should execute functions in the server by binding a service as rpc', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: fetch as any,
          })
        })

        const serviceRpc = bind<typeof services.service>(client, 'service')

        expect(await serviceRpc.identity(5)).toBe(5)
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

        expect(await rFunc()).toBe(instantiateServices(services).service.one())
      })


      // bug
      // throws an error when running parallel requests in batch mode
      it('should use batch in parallel requests', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: fetch as any,
          }),
        })
        const rFunc = bind(client, func(`async (x) => service.identity(x)`))

        client.useBatch({
          timeout: 100
        })
        const [x1, x2] = await Promise.all([rFunc(1), rFunc(2)])

        expect(x1).toBe(1)
        expect(x2).toBe(2)
      })

      it('should receive and execute remote funcs as param', async () => {
        const client = createClient({
          handler: httpHandler({
            url: `http://localhost:${PORT}/`,
            fetch: fetch as any,
          }),
        })

        const sum1 = func(`async (x) => x + 1`)
        const rFunc = bind(client, func(`async (x, sum1) => sum1(service.identity(x))`))
        const r = await rFunc(1, sum1)

        expect(r).toBe(2)
      })

      afterAll(server.afterAll.bind(server))
    })
  })
})

describe('Engine Handler', () => {
  let engine: Engine | void
  beforeAll((done) => {
    engine = createEngine({
      services,
      context,
    })
    done()
  })

  it('should communicate', async () => {
    const client = createClient({
      handler: engineHandler(engine as Engine)
    })
    const rFunc = bind(client, func(`async () => service.one()`))
    expect(await rFunc()).toBe(instantiateServices(services).service.one())
  })

  afterAll(() => {
    engine = void 0
  })
})
