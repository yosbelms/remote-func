import { readOnly, deepClone, DeepClone } from './util'

const SERVICE = Symbol('service')
const API = Symbol('api')

export type Result<T> = DeepClone<T>

interface EndpointsDict {
  [endpointName: string]: (...args: any[]) => any
}

interface FoldedApi {
  [serviceName: string]: (ctx?: any) => object
  [API]?: boolean
}

export interface UnfoldedApi {
  [serviceName: string]: EndpointsDict
}

type UnfoldApiType<Api extends FoldedApi> = {
  [P in keyof Api]: ReturnType<Api[P]>
}

export type FoldApiType<Api extends UnfoldedApi> = {
  [P in keyof Api]: (ctx?: any) => Api[P]
}

export const isService = (service: any) => {
  return service && (service as any)[SERVICE]
}

export const isApi = (api: any) => {
  return api && (api as any)[API]
}

export const createService = <Ctx, Body>(factory: (ctx?: Ctx) => Body): Body => {
  (factory as any)[SERVICE] = true
  return factory as unknown as Body
}

export const createApi = <Api extends UnfoldedApi>(apiCfg: Api): Api => {
  (apiCfg as any)[API] = true
  return apiCfg as Api
}

export const instantiateService = (service: EndpointsDict, context?: any) => {
  const serviceInstance = (service as unknown as Function)(context)
  return readOnly(serviceInstance, {
    get(target: any, prop: any): any {
      const endpoint = target[prop]
      return (...args: any[]) => deepClone(endpoint(...args))
    }
  })
}

export const instantiateApi = <Ctx, Api extends UnfoldedApi>(api: Api, ctx?: Ctx): Api => {
  const apiMemo = new Map<string, any>()
  return readOnly(api, {
    get(target: any, prop: any): any {
      let serviceInstance = apiMemo.get(prop)
      if (!serviceInstance) {
        const service = target[prop]
        if (!isService(service)) {
          return service
        }
        serviceInstance = instantiateService(service, ctx)
        apiMemo.set(prop, serviceInstance)
      }
      return serviceInstance
    },
  })
}

export const readApi = <T extends FoldedApi>(api: T): UnfoldApiType<T> => {
  if (!api) {
    throw new Error('invalid api')
  }
  if (api.default !== void 0) {
    throw new Error('api ashould not export default')
  }

  Object.entries(api).forEach(([key, service]) => {
    if (!isService(service)) {
      throw new Error(`Invalid service: '${key}'`)
    }
  })

  return { ...api } as UnfoldApiType<T>
}
