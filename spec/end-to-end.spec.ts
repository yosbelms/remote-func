import 'jasmine'
import express from 'express'
import { createEngine, expressHandler, Result } from '../server'
import { createClient, httpHandler, func, bind } from '../client'
import fetch from 'node-fetch'

const port = 7000
const api = {
  one: (): Result<number> => 1,
  newDate: (): Result<Date> => new Date(),
}

describe('End to End', () => {
  beforeAll((done) => {
    const app = express()
    const engine = createEngine({ api })
    app.use('/', expressHandler(engine))
    app.listen(port, () => done())
  })

  it('should execute functions in the server', async () => {
    const client = createClient({
      handler: httpHandler({
        url: `http://localhost:${port}/`,
        fetch: fetch as any,
      })
    })
    const rFunc = bind(client, func(`async () => one()`))

    expect(await rFunc()).toBe(api.one())
  })

  it('should execute functions in the server using GET', async () => {
    const client = createClient({
      handler: httpHandler({
        url: `http://localhost:${port}/`,
        fetch: (url: string, { headers, body }) => {
          return fetch(`${url}?requests=${encodeURIComponent(body)}`, { method: 'GET', headers })
        },
      }),
    })
    const rFunc = bind(client, func(`async () => one()`))

    expect(await rFunc()).toBe(api.one())
  })
})
