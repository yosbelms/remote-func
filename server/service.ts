import { readOnly, deepClone, DeepClone } from './util'

const SERVICE = Symbol('service')

export type Result<T> = DeepClone<T>

export type ServiceContext<Ctx extends object = {}> = ({
  source: string
  args: any[]
} & Ctx)

export interface Services {
  [serviceName: string]: {
    [endpointName: string]: (ctx?: any) => any
  }
}

const isService = (service: any) => {
  return service && (service as any)[SERVICE]
}

const instantiateService = (service: Function, context?: any) => {
  const serviceInstance = service(context)
  return readOnly(serviceInstance, {
    get(target: any, prop: any): any {
      const endpoint = target[prop]
      if (typeof endpoint !== 'function') {
        throw new Error(`'${prop}' is not a function`)
      }
      return (...args: any[]) => deepClone(endpoint(...args))
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

export const createService = <Ctx extends ServiceContext, ServiceDef>(
  serviceFactory: (ctx: Ctx) => ServiceDef
): ServiceDef => {
  (serviceFactory as any)[SERVICE] = true
  return serviceFactory as unknown as ServiceDef
}

export const instantiateServices = <Ctx, Srvcs extends Services>(
  services: Srvcs,
  ctx?: Ctx
): Srvcs => {
  const _services = readServices(services)
  const servicesMemo = new Map<string, any>()
  return readOnly(_services, {
    get(target: any, prop: any): any {
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



// import { readOnly, deepClone, DeepClone } from './util'

// const SERVICE = Symbol('service')
// const SERVICES = Symbol('services')

// export type Result<T> = DeepClone<T>

// export type ServiceContext<Ctx extends object = {}> = ({
//   source: string
//   args: any[]
// } & Ctx)

// type EndpointsDict = {
//   [endpointName: string]: (...args: any[]) => any
// }

// export interface FoldedServices {
//   [serviceName: string]: (ctx?: any) => object
//   [SERVICES]?: boolean
// }

// export interface UnfoldedServices {
//   [serviceName: string]: EndpointsDict
// }

// type UnfoldServicesType<Services extends FoldedServices> = {
//   [P in keyof Services]: ReturnType<Services[P]>
// }

// export type FoldServicesType<Services extends UnfoldedServices> = {
//   [P in keyof Services]: (ctx?: any) => Services[P]
// }

// export const isService = (service: any) => {
//   return service && (service as any)[SERVICE]
// }

// export const isServices = (services: any) => {
//   return services && (services as any)[SERVICES]
// }

// export const createService = <Ctx extends ServiceContext, Body>(serviceFactory: (ctx: Ctx) => Body): Body => {
//   (serviceFactory as any)[SERVICE] = true
//   return serviceFactory as unknown as Body
// }

// export const createServices = <Services extends FoldedServices>(servicesCfg: Services): Services => {
//   servicesCfg[SERVICES] = true
//   return servicesCfg as Services
// }

// export const instantiateService = (service: EndpointsDict, context?: any) => {
//   const serviceInstance = (service as unknown as Function)(context)
//   return readOnly(serviceInstance, {
//     get(target: any, prop: any): any {
//       const endpoint = target[prop]
//       return (...args: any[]) => deepClone(endpoint(...args))
//     }
//   })
// }

// export const instantiateServices = <Ctx, Services extends UnfoldedServices>(services: Services, ctx?: Ctx): Services => {
//   const servicesMemo = new Map<string, any>()
//   return readOnly(services, {
//     get(target: any, prop: any): any {
//       let serviceInstance = servicesMemo.get(prop)
//       if (!serviceInstance) {
//         const service = target[prop]
//         if (!isService(service)) {
//           return service
//         }
//         serviceInstance = instantiateService(service, ctx)
//         servicesMemo.set(prop, serviceInstance)
//       }
//       return serviceInstance
//     },
//   })
// }

// export const readServices = <T extends FoldedServices>(services: T): UnfoldServicesType<T> => {
//   if (!services) {
//     throw new Error('invalid services')
//   }
//   if (services.default !== void 0) {
//     throw new Error('services should not export default')
//   }

//   Object.entries(services).forEach(([key, service]) => {
//     if (!isService(service)) {
//       throw new Error(`invalid service: '${key}'`)
//     }
//   })

//   return { ...services } as UnfoldServicesType<T>
// }
