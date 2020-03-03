import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { mins, deepMap, isFunction } from './util'
import { EvalError } from './error'
import { readModule, contextifyApi } from './api'
import { Cache } from './cache'
import { createFuntainer, Funtainer } from '../funtainer'

export interface EngineConfig {
  api: any
  middlewares: Middleware<any>[]
  timeout: number
  filename: string
}

export class Engine {
  private config: Partial<EngineConfig>
  private funtainerCache: Cache<Funtainer>
  private composedMiddleware: ComposedMiddleware<any>
  private apiKeys: string[]
  private api: any

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      ...config,
    }

    this.composedMiddleware = koaCompose(this.config.middlewares || [])
    this.funtainerCache = new Cache()
    this.api = readModule(config.api || {})
    this.apiKeys = Object.keys(this.api)
  }

  getConfig(): Partial<EngineConfig> {
    return { ...this.config }
  }

  async run(source: string, args?: any[], context?: any): Promise<any> {
    return this.composedMiddleware(context, () => this.execute(source, args, context))
  }

  private execute(source: string, args?: any[], context?: any) {
    let funtainer = this.funtainerCache.get(source)
    if (!funtainer) {
      try {
        funtainer = createFuntainer({
          globalNames: this.apiKeys,
          timeout: this.config.timeout,
          source,
        })
        this.funtainerCache.set(source, funtainer)
      } catch (err) {
        throw new EvalError(String(err.stack))
      }
    }

    const contextifedApi = contextifyApi(this.api, context)
    const globals = { ...contextifedApi }

    return funtainer(args, globals)
  }

  getEndpointPaths(): string[] {
    const paths: string[] = []
    deepMap(this.getConfig().api, (value, _, path) => {
      if (isFunction(value)) {
        paths.push(path.join('.'))
      }
    })
    return paths
  }
}

export const createEngine = (config: Partial<EngineConfig> = {}): Engine => {
  return new Engine(config)
}
