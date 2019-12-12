import { createRunner, Runner } from '../server/runner'
import 'jasmine'
import { secs } from '../server/util'
import { EvalError, RuntimeError, TimeoutError } from '../server/error'
import { withContext } from '../server/api'

describe('runner', () => {
  let runner: Runner
  afterEach(() => runner.destroy())

  it('should run javascript function', async () => {
    const value = 1
    runner = createRunner()
    const result = await runner.run('(a) => a', [value])
    expect(result).toBe(value)
  })

  it('should throw EvalError if source is not a function', (done) => {
    const value = 1
    runner = createRunner()
    runner.run('const a', [value]).catch(err => {
      expect(err instanceof EvalError).toBeTruthy()
      done()
    })
  })

  it('should throw EvalError if there is an error while evaluating', (done) => {
    const value = 1
    runner = createRunner()
    runner.run('() => #', [value]).catch(err => {
      expect(err instanceof EvalError).toBeTruthy()
      done()
    })
  })

  it('should throw RuntimeError if there is an error while executing', (done) => {
    runner = createRunner()
    runner.run('() => {throw new Error()}').catch(err => {
      expect(err instanceof RuntimeError).toBeTruthy()
      done()
    })
  })

  it('should throw TimeoutError if there is an error while executing', (done) => {
    runner = createRunner({ timeout: secs(1) })
    runner.run('() => {while (true) {}}').catch(err => {
      expect(err instanceof TimeoutError).toBeTruthy()
      done()
    })
  })

  it('should use the same context for all calls inside a remote function', (done) => {
    runner = createRunner({
      api: {
        f1: withContext(ctx => () => ctx),
        f2: withContext(ctx => () => ctx),
      }
    })

    const rf = `async () => {
      const r1 = await f1()
      const r2 = await f2()
      return r1 === r2
    }`

    const p1 = runner.run(rf, void 0, 5)
    const p2 = runner.run(rf, void 0, 7)
    Promise.all([p1, p2]).then(([r1, r2]) => {
      expect(r1).toBeTruthy()
      expect(r2).toBeTruthy()
      done()
    })
  })

  it('should work with middlewares', (done) => {
    const middlewares = []
    const context: { newCtxProp?: number } = {
      newCtxProp: void 0
    }

    middlewares.push(async (ctx: any, next: Function) => {
      ctx.newCtxProp = 0 // init
      const result = await next()
      ctx.newCtxProp = 0 // reset
      return result
    })

    runner = createRunner({
      middlewares,
      api: {
        f1: withContext((ctx: any) => (x: number) => {
          ctx.newCtxProp += x
          return ctx.newCtxProp
        })
      },
    })

    runner.run(`async () => {
      await f1(5)
      await f1(5)
      return await f1(1)
    }`, [], context).then(r => {
      expect(r).toBe(11)
      expect(context.newCtxProp).toBe(0)
      done()
    })
  })

})
