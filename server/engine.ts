import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { mins } from './util'
import { EvalError } from './error'
import { instantiateServices, Services, ServiceContext } from './service'
import { Cache } from './cache'
import { createCfunc, Cfunc } from '../cfunc'

export interface EngineConfig {
  services: Services
  servicesPath: String
  middlewares: Middleware<ServiceContext>[]
  timeout: number
}

export class Engine {
  private config: Partial<EngineConfig>
  private cfuncCache: Cache<Cfunc>
  private composedMiddleware: ComposedMiddleware<ServiceContext>
  private services: Services
  private servicesKeys: string[]
  private servicesModule: any

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      ...config,
    }

    this.composedMiddleware = koaCompose(this.config.middlewares || [])
    this.cfuncCache = new Cache()

    this.services = config.services || {}
    this.servicesKeys = Object.keys(this.services)

    const servicesPath = this.config.servicesPath

    if (typeof servicesPath === 'string' && servicesPath !== '') {
      if (config.services) {
        throw new Error(`Can provide either 'servicesPath' or 'services'`)
      }
      this.servicesModule = import(servicesPath).then((module) => {
        this.services = module
        this.servicesKeys = Object.keys(this.services)
        this.servicesModule = void 0
      })
    }
  }

  getConfig(): Partial<EngineConfig> {
    return { ...this.config }
  }

  async run(source: string, args?: any[], context?: any): Promise<any> {
    if (this.servicesModule) await this.servicesModule
    return this.composedMiddleware(context, () => this.execute(source, args, context))
  }

  private execute(source: string, args?: any[], context?: any) {
    let cfunc = this.cfuncCache.get(source)
    if (!cfunc) {
      try {
        cfunc = createCfunc({
          globalNames: this.servicesKeys,
          timeout: this.config.timeout,
          source,
        })
        this.cfuncCache.set(source, cfunc)
      } catch (err) {
        throw new EvalError(String(err.stack))
      }
    }

    const contextifiedServices = instantiateServices(this.services, context)
    const globals = { ...contextifiedServices }
    return cfunc(args, globals)
  }

  getEndpointPaths(): string[] {
    const paths: string[] = []
    const services = instantiateServices(this.services)
    Object.keys(services).forEach(serviceName => {
      const service = services[serviceName]
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
