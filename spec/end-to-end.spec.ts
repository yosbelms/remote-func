import 'jasmine'
import { createRunner, setupExpressServer, Result } from '../server'
import { createClient, func } from '../client'
import fetch from 'node-fetch'

const port = 7000
const api = {
  one: (): Result<number> => 1,
  newDate: (): Result<Date> => new Date(),
}

describe('End to End', () => {
  beforeAll((done) => {
    setupExpressServer({
      runner: createRunner({
        api,
      })
    }).listen(port, () => done())
  })

  it('should execute functions in the server', async () => {
    const rFunc = func(`async () => one()`)
    createClient({
      url: `http://localhost:${port}/`,
      fetch: fetch as any,
      functions: [rFunc],
    })
    expect(await rFunc()).toBe(api.one())
  })

  it('should execute functions in the server using GET', async () => {
    const rFunc = func(`async () => one()`)
    createClient({
      url: `http://localhost:${port}/`,
      fetch: (url: string, { headers, body }) => {
        return fetch(`${url}?requests=${encodeURIComponent(body)}`, { method: 'GET', headers })
      },
      functions: [rFunc],
    })
    expect(await rFunc()).toBe(api.one())
  })
})
