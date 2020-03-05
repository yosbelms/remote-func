import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { mins } from './util'
import { EvalError } from './error'
import { UnfoldedApi, FoldApiType, readApi, instantiateApi } from './api'
import { Cache } from './cache'
import { createFuntainer, Funtainer } from '../funtainer'

export interface EngineConfig {
  api: UnfoldedApi
  middlewares: Middleware<any>[]
  timeout: number
  filename: string
}

export class Engine {
  private config: Partial<EngineConfig>
  private funtainerCache: Cache<Funtainer>
  private composedMiddleware: ComposedMiddleware<any>
  private api: UnfoldedApi
  private apiKeys: string[]

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      ...config,
    }

    const api = config.api || {}
    this.composedMiddleware = koaCompose(this.config.middlewares || [])
    this.funtainerCache = new Cache()
    this.api = readApi(api as unknown as FoldApiType<typeof api>)
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

    const contextifiedServices = instantiateApi(this.api, context)
    const globals = { ...contextifiedServices }
    return funtainer(args, globals)
  }

  getEndpointPaths(): string[] {
    const paths: string[] = []
    const api = instantiateApi(this.api)
    Object.keys(api).forEach(serviceName => {
      const service = api[serviceName]
      Object.keys(service).forEach(endpointName => {
        paths.push(`${serviceName}.${endpointName}`)
      })
    })
    return paths
  }

}

export const createEngine = (config: Partial<EngineConfig> = {}): Engine => {
  return new Engine(config)
}
