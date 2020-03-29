import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { mins } from './util'
import { EvalError } from './error'
import { UnfoldedApi, FoldApiType, readApi, instantiateApi, ServiceContext } from './api'
import { Cache } from './cache'
import { createSefunc, Sefunc } from '../sefunc'

export interface EngineConfig {
  api: UnfoldedApi
  middlewares: Middleware<ServiceContext>[]
  timeout: number
  filename: string
}

export class Engine {
  private config: Partial<EngineConfig>
  private sefuncCache: Cache<Sefunc>
  private composedMiddleware: ComposedMiddleware<ServiceContext>
  private api: UnfoldedApi
  private apiKeys: string[]

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      ...config,
    }

    const api = config.api || {}
    this.composedMiddleware = koaCompose(this.config.middlewares || [])
    this.sefuncCache = new Cache()
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
    let sefunc = this.sefuncCache.get(source)
    if (!sefunc) {
      try {
        sefunc = createSefunc({
          globalNames: this.apiKeys,
          timeout: this.config.timeout,
          source,
        })
        this.sefuncCache.set(source, sefunc)
      } catch (err) {
        throw new EvalError(String(err.stack))
      }
    }

    const contextifiedServices = instantiateApi(this.api, context)
    const globals = { ...contextifiedServices }
    return sefunc(args, globals)
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
