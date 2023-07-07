import { mins, isFunction, noop, isString, identity } from './util'
import { EvalError } from './error'
import { ServiceBaseContext, instantiateServices, Services } from './service'
import { Cache } from './cache'
import { RequestContext } from './http'
import { parseRpcCommand, isRpcCommand } from './rpc'
import { getPartialFuncSource, isPartialFunc } from './partial-func'
import { JailedFunction, createJailedFunction } from 'jailed-function'

export interface EngineConfig {
  /** Dictionary of services */
  services: Services
  /** Path to a file containing services */
  servicesPath: String
  /** Transform query context in service context */
  context: (reqCtx: RequestContext) => ServiceBaseContext
  /** Read source dynamically */
  source: (src: string) => Promise<string> | string
  /** Max execution time for query functions */
  timeout: number,
  /** Whether display query errors or not */
  displayErrors: boolean
}

/** Run JavaScript query functions */
export class Engine {
  private config: Partial<EngineConfig>
  private jailedFunctionCache: Cache<JailedFunction>
  private services: Services
  private servicesKeys: string[]
  private servicesModule: any
  private readSource: (src: string) => Promise<string> | string

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      displayErrors: true,
      ...config,
    }

    this.readSource = this.config.source || identity
    this.jailedFunctionCache = new Cache()
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
    const src = await this.readSource(source)
    return await this.execute(src, args, ctx, queryContext)
  }

  private async execute(source: string, args?: any[], serviceContext?: ServiceBaseContext, queryContext?: any) {
    const onError = this.config.displayErrors ? console.error.bind(console) : noop

    const contextifiedServices = instantiateServices(this.services, serviceContext)
    const globals = { ...contextifiedServices }

    if (isRpcCommand(source)) {
      return this.handleRpc(parseRpcCommand(source), args, contextifiedServices, onError)
    }

    const parsedFunc = this.parseFunc(source, onError, globals, queryContext)

    const _args = await Promise.all((args || []).map(async arg => {
      if (isString(arg) && isPartialFunc(arg)) {
        // read source
        const partialFunctionSource = await this.readSource(getPartialFuncSource(arg))
        const parsedPartialFunc = this.parseFunc(partialFunctionSource, onError, globals)
        return (...args: any[]) => parsedPartialFunc(args)
      }
      return arg
    }))

    return parsedFunc(_args)
  }

  private parseFunc(source: string, onError: Function, globals?: any, queryContext?: any) {
    let jailedFunction = this.jailedFunctionCache.get(source)
    if (!jailedFunction) {
      try {
        jailedFunction = createJailedFunction({
          readOnlyArguments: false,
          readOnlyGlobals: false,
          readOnlyResult: false,
          globalNames: this.servicesKeys,
          timeout: this.config.timeout,
          source,
        })
        this.jailedFunctionCache.set(source, jailedFunction)
      } catch (err) {
        let location = ''
        if (queryContext && queryContext.sourceLoc) {
          const sourceLoc = queryContext.sourceLoc
          location = `Source location: ${sourceLoc}`
        }
        const error = new EvalError(`in query: ${location} \n ${source} \n ${String(err)}`)
        onError(error)
        throw error
      }
    }

    return (args?: any[]) => {
      return (jailedFunction as JailedFunction)(args, globals).catch((err: Error) => {
        onError(new Error(`in query query: ${source} \n ${String(err.stack)}`))
        throw err
      })
    }
  }

  private handleRpc(rpcCommand: { service: string, method: string }, args?: any[], contextifiedServices?: any, onError?: any) {
    // handle rpc
    const { service, method } = rpcCommand
    if (this.servicesKeys.indexOf(service) === -1) {
      const error = new EvalError(`invalid service name: ${service}}`)
      onError(error)
      throw error
    }
    return contextifiedServices[service][method].apply(null, args as [any])
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
