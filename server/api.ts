import { Runner } from './runner'
import { isFunction, deepMap, deepClone, isObject, isString, DeepClone } from './util'

export const SERIALIZED_FUNCTION_TOKEN = '@@token/function'
export const ENDPOINT_TOKEN = '@@token/endpoint'
export const API_MODULE_TOKEN = '@@token/api-module'

export type Result<T> = DeepClone<T>

export interface ApiModule {
  namespace: string
  api: any
  init: Function
}

export const declareApiModule = (namespace: string, init?: (runner: Runner) => void): void => {
  return {
    API_MODULE_TOKEN,
    namespace,
    init,
  } as unknown as void
}

const isApiModuleDeclaration = (modDeclaration: any) => {
  return (
    isObject(modDeclaration)
    && modDeclaration.API_MODULE_TOKEN === API_MODULE_TOKEN
    && isString(modDeclaration.namespace)
  )
}

export const isApiModule = (mod: any) => {
  return (
    mod
    && mod.default
    && isApiModuleDeclaration(mod.default)
  )
}

export const readApiModule = (mod: any): ApiModule => {
  if (isApiModule(mod)) {
    const ns = mod.default.namespace
    const api = mod[ns]
    const init = isFunction(mod.default.init) && mod.default.init
    return {
      namespace: ns,
      api: { [ns]: api },
      init
    }
  } else {
    throw new Error(`invalid api module`)
  }
}

export const endpoint = <C, F extends Function>(fn: (ctx: C) => F) => {
  (fn as any)[ENDPOINT_TOKEN] = true
  return fn as unknown as F
}

export const isEndpoint = (fn: Function) => {
  return (fn as any)[ENDPOINT_TOKEN]
}

export const contextifyApi = <T>(api: T, context?: any): T => {
  return deepMap(api, (propValue, container) => {
    if (isFunction(propValue)) {
      let fn = propValue.bind(container)

      if (isEndpoint(propValue)) {
        fn = fn(context)
      }

      return (...args: any[]) => deepClone(fn(...args))
    }
    return propValue
  })
}
