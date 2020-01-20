import { Script } from 'vm'
import deepFreeze from 'deep-freeze'
import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { mins, isFunction } from './util'
import { EvalError } from './error'
import { readApiModule, contextifyApi } from './api'
import { FunctionCache } from './function-cache'
import { transform } from './function-transform'
import { createWatchdog } from './watchdog'
import { proxifyDeep, createModuleContextProxies } from './proxy'

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
  private middlewares: Middleware<any>[]
  private composedMiddleware?: ComposedMiddleware<any>
  private api: any

  constructor(config: Partial<RunnerConfig>) {
    this.config = {
      timeout: mins(1),
      middlewares: [],
      hashMap: {},
      ...config,
    }

    const apiModule = config.apiModule ? readApiModule(config.apiModule) : void 0

    this.functionCache = new FunctionCache()
    this.middlewares = this.config.middlewares || []
    this.api = apiModule ? apiModule.api : this.config.api
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
    return this.composedMiddleware(context, () => this.execute(source, args, context))
  }

  private execute(source: string, args?: any[], context?: any) {
    let fn = this.functionCache.get(source)
    const api = this.api || {}
    const apiKeys = Object.keys(api)
    const contextifedApi = deepFreeze(contextifyApi(api, context))
    const apiValues = apiKeys.map(key => contextifedApi[key])

    if (!fn) {
      try {
        const { code } = transform(source)

        const script = new Script(`exports.default = (${apiKeys.join(',')}) => ${code};`, {
          filename: 'remote-func:vm',
        })

        const ctx = {
          ...createModuleContextProxies(),
          createWatchdog: proxifyDeep(() => createWatchdog({
            maxRunningTime: this.config.timeout,
          })),
          exports: Object.create(null),
        }

        script.runInNewContext(ctx, {
          displayErrors: true,
          timeout: this.config.timeout,
          breakOnSigint: true,
        })

        fn = ctx.exports.default

        if (!isFunction(fn)) {
          throw new Error('function expected')
        }

        this.functionCache.set(source, fn as Function)
      } catch (err) {
        throw new EvalError(String(err))
      }
    }

    return ((fn as Function)
      .apply(null, apiValues)
      .apply(null, args)
    )
  }
}

export const createRunner = (config: Partial<RunnerConfig> = {}): Runner => {
  return new Runner(config)
}
