import { Script } from 'vm'
import deepFreeze from 'deep-freeze'
import delay from 'delay'
import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { secs, createConsole, mins } from './util'
import { ErrorType, EvalError, ExitError, RuntimeError, TimeoutError } from './error'
import { serializeApi, callInApi, readApiModule } from './api'
import { FunctionCache } from './function-cache'
import { transform } from './source-processor'
import { createFunctionRuntime } from './function-runtime'
import { proxify, proxies } from './proxy'
import { createDeflateRaw } from 'zlib'

export interface RunnerConfig {
  apiModule: any
  api: any
  middlewares: Middleware<any>[]
  timeout: number
  filename: string
  hashMap: { [k: string]: string }
}

export class Runner {
  private config: Partial<RunnerConfig>
  private functionCache: FunctionCache
  private hashMap: Map<string, string>
  private middlewares: Middleware<any>[]
  private composedMiddleware?: ComposedMiddleware<any>
  private api: any

  constructor(config: Partial<RunnerConfig>) {
    this.config = {
      timeout: secs(15),
      middlewares: [],
      hashMap: {},
      ...config,
    }

    const apiModule = config.apiModule ? readApiModule(config.apiModule) : void 0

    this.functionCache = new FunctionCache()
    // this.config.api = deepFreeze(this.config.api)
    this.hashMap = new Map(Object.entries(this.config.hashMap || {}))
    this.middlewares = []
    this.api = deepFreeze(apiModule ? apiModule.api : this.config.api)
  }

  use(middleware: Middleware<any>) {
    this.composedMiddleware = void 0
    this.middlewares.push(middleware)
  }

  async run(sourceOrHash: string, args?: any[], context?: any): Promise<any> {
    let source = sourceOrHash
    if (!this.composedMiddleware) {
      this.composedMiddleware = koaCompose(this.middlewares)
    }

    if (this.hashMap.size > 0) {
      if (this.hashMap.has(sourceOrHash)) {
        source = this.hashMap.get(sourceOrHash) || ''
      } else {
        throw new EvalError(`unknown source: ${sourceOrHash}`)
      }
    }

    return this.composedMiddleware(context, () => this.execute(source, args))
  }

  private execute(source: string, args?: any[]) {
    let fn = this.functionCache.get(source)
    if (!fn) {
      try {
        const { code } = transform(source)
        const script = new Script(`exports.default = ${code};`, {
          filename: 'remote-func:vm',
        })

        const ctx = {
          ...this.api,
          ...proxies,
          createFunctionRuntime: proxify(createFunctionRuntime),
          exports: Object.create(null),
        }

        script.runInNewContext(ctx, {
          displayErrors: true,
          timeout: this.config.timeout,
          breakOnSigint: true,
        })

        fn = ctx.exports.default
        this.functionCache.set(source, fn as Function)
      } catch (err) {
        throw err
      }
    }
    return (fn as Function).apply(null, args)
  }
}

export const createRunner = (config: Partial<RunnerConfig> = {}): Runner => {
  return new Runner(config)
}
