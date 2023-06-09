import 'jasmine'
import { Cache } from '../server/cache'
import delay from 'delay'

describe('function cache', () => {
  it('gc remove iddle', async () => {
    const fc = new Cache({ maxIddleTime: 1, gcIntervalTime: 1, maxEntriesCount: 0 })
    fc.set('x', () => {})
    await delay(100)
    expect(fc.size()).toBe(0)
  })

  it('gc remove stale', async () => {
    const fc = new Cache({ maxIddleTime: 20000, gcIntervalTime: 1, maxEntriesCount: 1 })
    fc.set('x', () => {})
    fc.set('y', () => {})
    await delay(100)
    expect(fc.size()).toBe(0)
  })
})
