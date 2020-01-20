import 'jasmine'
import { FunctionCache } from '../server/function-cache'
import delay from 'delay'

describe('function cache', () => {
  it('gc remove iddle', async () => {
    const fc = new FunctionCache({ maxIddleTime: 1, gcIntervalTime: 1, maxFunctionsCount: 0 })
    fc.set('x', () => {})
    await delay(100)
    expect(fc.size()).toBe(0)
  })

  it('gc remove stale', async () => {
    const fc = new FunctionCache({ maxIddleTime: 20000, gcIntervalTime: 1, maxFunctionsCount: 1 })
    fc.set('x', () => {})
    fc.set('y', () => {})
    await delay(100)
    expect(fc.size()).toBe(0)
  })
})
