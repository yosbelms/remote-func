import { mins, isFunction, noop } from './util'
import { EvalError } from './error'
import { instantiateServices, Services } from './service'
import { Cache } from './cache'
import { createCfunc, Cfunc } from '../cfunc'
import { RequestContext } from './http'

export interface EngineConfig {
  /** Dictionary of services */
  services: Services
  /** Path to a file containing services */
  servicesPath: String
  /** Transform query context in service context */
  context: (reqCtx: RequestContext) => any
  /** Max execution time for query functions */
  timeout: number
}

/** Run JavaScript query functions */
export class Engine {
  private config: Partial<EngineConfig>
  private cfuncCache: Cache<Cfunc>
  private services: Services
  private servicesKeys: string[]
  private servicesModule: any

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      ...config,
    }

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

  /** Return engine configuration */
  getConfig(): Partial<EngineConfig> {
    return { ...this.config }
  }

  /** Run query function */
  async run(source: string, args?: any[], queryContext?: any): Promise<any> {
    if (this.servicesModule) await this.servicesModule
    const createContext: any = isFunction(this.config.context) ? this.config.context : noop
    const ctx = await createContext(queryContext)
    return this.execute(source, args, ctx)
  }

  private execute(source: string, args?: any[], serviceContext?: any) {
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

    const contextifiedServices = instantiateServices(this.services, serviceContext)
    const globals = { ...contextifiedServices }
    return cfunc(args, globals)
  }

  /** Return path of registered endpoints */
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

/** Create new Engine */
export const createEngine = (config: Partial<EngineConfig> = {}): Engine => {
  return new Engine(config)
}
