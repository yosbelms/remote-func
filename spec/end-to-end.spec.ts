import 'jasmine'
import { createEngine, expressHandler, microHandler, Result } from '../server'
import { createClient, httpHandler, func, bind } from '../client'
import fetch from 'node-fetch'

import express from 'express'
const micro = require('micro')

const PORT = 7000
const api = {
  one: (): Result<number> => 1,
  newDate: (): Result<Date> => new Date(),
}

const servers: any = {
  // ExpressJS
  express: {
    server: void 0 as any,
    beforeAll(done: any) {
      const app = express()
      const engine = createEngine({ api })
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
      const engine = createEngine({ api })
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
        const rFunc = bind(client, func(`async () => one()`))

        expect(await rFunc()).toBe(api.one())
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
        const rFunc = bind(client, func(`async () => one()`))

        expect(await rFunc()).toBe(api.one())
      })

      afterAll(server.afterAll.bind(server))
    })
  })
})
