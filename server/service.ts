import { readOnly, deepClone, DeepClone, noop, isFunction } from './util'

const SERVICE = Symbol('service')

/** Utility to type endpoint results */
export type Result<T> = DeepClone<T>
export type AsyncResult<T> = Promise<Result<T>>
export type ServiceBaseContext = {
  log?: (...args: any[]) => any
  [prop: string]: any
}

// TypeScript issue: https://github.com/microsoft/TypeScript/issues/12776
export const AsyncResult = Promise


export interface Services {
  [serviceName: string]: {
    [endpointName: string]: (...args: any[]) => any
  }
}

const isService = (service: any) => {
  return service && (service as any)[SERVICE]
}

const getContextLogger = (ctx?: ServiceBaseContext): Function => {
  return (ctx && isFunction(ctx?.log) ? ctx?.log : noop) as Function
}

const instantiateService = (service: Function, ctx?: ServiceBaseContext) => {
  let log = getContextLogger(ctx)
  const serviceInstance = service(ctx)
  return readOnly(serviceInstance, {
    get(target: any, prop: any): any {
      const endpoint = target[prop]
      if (typeof endpoint !== 'function') {
        throw new Error(`'${prop}' is not a function`)
      }
      return (...args: any[]) => {
        log({ type: 'endpoint', name: prop, args })
        return deepClone(endpoint.apply(serviceInstance, args))
      }
    }
  })
}

const readServices = <T extends Services>(services: T): T => {
  if (!services) {
    throw new Error('invalid services')
  }
  if (services.default !== void 0) {
    throw new Error('services should not export default')
  }

  Object.entries(services).forEach(([key, service]) => {
    if (!isService(service)) {
      throw new Error(`invalid service: '${key}'`)
    }
  })

  return { ...services } as T
}

/** Create a service */
export const createService = <Ctx extends any, ServiceDef>(
  serviceFactory: (ctx: Ctx) => ServiceDef
): ServiceDef => {
  (serviceFactory as any)[SERVICE] = true
  return serviceFactory as unknown as ServiceDef
}

/** Instantiate and bind services to a provided context */
export const instantiateServices = <Srvcs extends Services>(
  services: Srvcs,
  ctx?: ServiceBaseContext,
): Srvcs => {
  let log = getContextLogger(ctx)
  const _services = readServices(services)
  const servicesMemo = new Map<string, any>()
  return readOnly(_services, {
    get(target: any, prop: any): any {
      log({ type: 'service', name: prop })
      let serviceInstance = servicesMemo.get(prop)
      if (!serviceInstance) {
        const service = target[prop]
        if (!isService(service)) {
          return service
        }
        serviceInstance = instantiateService(service, ctx)
        servicesMemo.set(prop, serviceInstance)
      }
      return serviceInstance
    },
  })
}
