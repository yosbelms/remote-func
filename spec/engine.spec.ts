import { createEngine, Engine } from '../server/engine'
import 'jasmine'
import { EvalError, TimeoutError } from '../server/error'
import { createService, createApi } from '../server/api'
import { secs } from '../server/util'

describe('engine', () => {
  let engine: Engine

  it('should run javascript function', async () => {
    const value = 1
    engine = createEngine()
    const result = await engine.run('async (a) => a', [value])
    expect(result).toBe(value)
  })

  it('should throw EvalError if source is not a function', (done) => {
    const value = 1
    engine = createEngine()
    engine.run('const a', [value]).catch(err => {
      expect(err instanceof EvalError).toBeTruthy()
      done()
    })
  })

  it('should throw EvalError if there is an error while evaluating', (done) => {
    const value = 1
    engine = createEngine()
    engine.run('async () => #', [value]).catch(err => {
      expect(err instanceof EvalError).toBeTruthy()
      done()
    })
  })

  it('should throw TimeoutError if there is an error while executing', (done) => {
    engine = createEngine({ timeout: secs(1) })
    engine.run('async () => {while (true) {}}').catch(err => {
      expect(err instanceof TimeoutError).toBeTruthy()
      done()
    })
  })

  it('should use the same context for all calls inside a remote function', (done) => {
    engine = createEngine({
      api: createApi({
        s1: createService(ctx => ({
          endpoint: () => ctx
        })),
        s2: createService(ctx => ({
          endpoint: () => ctx
        })),
      })
    })

    const rf = `async () => {
      const r1 = await s1.endpoint()
      const r2 = await s2.endpoint()
      return r1 === r2
    }`

    const p1 = engine.run(rf, void 0, 5)
    const p2 = engine.run(rf, void 0, 7)
    Promise.all([p1, p2]).then(([r1, r2]) => {
      expect(r1).toBeTruthy()
      expect(r2).toBeTruthy()
      done()
    })
  })

  it('should work with middlewares', (done) => {
    const middlewares = []
    const context: { newCtxProp?: number } = {
      newCtxProp: 0
    }

    middlewares.push(async (ctx: any, next: Function) => {
      ctx.newCtxProp = 0 // init
      const result = await next()
      ctx.newCtxProp = 0 // reset
      return result
    })

    engine = createEngine({
      middlewares,
      api: createApi({
        s1: createService((ctx: any) => ({
          endpoint: (x: number) => {
            ctx.newCtxProp += x
            return ctx.newCtxProp
          }
        }))
      }),
    })

    engine.run(`async () => {
      await s1.endpoint(5)
      await s1.endpoint(5)
      return await s1.endpoint(1)
    }`, [], context).then(r => {
      expect(r).toBe(11)
      expect(context.newCtxProp).toBe(0)
      done()
    })
  })

  it('should return endpoints paths', () => {
    engine = createEngine({
      api: createApi({
        service: createService(() => ({
          endpoint1: () => null,
          endpoint2: () => null,
        })),
      })
    })

    const paths = engine.getEndpointPaths()

    expect(paths).toEqual([
      'service.endpoint1',
      'service.endpoint2',
    ])
  })

})
