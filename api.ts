import { deepMap, getProp, isFunction } from './util'
import { Runner } from './runner'

export const SERIALIZED_FUNCTION_TOKEN = '@@token/function'
export const WITH_CONTEXT_TOKEN = '@@token/with-context'
export const API_MODULE_TOKEN = '@@toker/api-module'

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

export const readApiModule = (_module: any): ApiModule => {
  if (_module && _module.default && _module.default.API_MODULE_TOKEN === API_MODULE_TOKEN) {
    const _namespace = _module.default.namespace
    if (typeof _namespace !== 'string') throw new Error(`invalid namespace '${_namespace}'`)
    const api = _module[_namespace]
    if (api === void 0) throw new Error(`undefined api '${_namespace}'`)
    const init = typeof _module.default.init === 'function' && _module.default.init
    return { 'namespace': _namespace, api, init }
  } else {
    throw new Error(`invalid api module`)
  }
}

export const withContext = <C, F>(fn: (ctx: C) => F) => {
  (fn as any)[WITH_CONTEXT_TOKEN] = true
  return fn as unknown as F
}

export const serializeApi = (api: Object) => {
  return deepMap(api, (value: any) => {
    if (isFunction(value)) return SERIALIZED_FUNCTION_TOKEN
    return value
  })
}

export const createApiClient = (api: any, createClient: Function) => {
  return deepMap(api, (value: any, key: any, basePath: string[]) => {
    return (value === SERIALIZED_FUNCTION_TOKEN
      ? createClient(key, basePath)
      : value
    )
  })
}

export const callInApi = (
  api: Object,
  basePath: string[],
  method: string,
  args: any[] = [],
  ctx?: any
) => {
  const prop = getProp(api, basePath)
  if (isFunction(prop[method])) {
    let fn = prop[method]
    if (fn[WITH_CONTEXT_TOKEN]) {
      fn = fn(ctx)
      if (!isFunction(fn)) throw new Error('invalid function with context')
    }
    return fn(...args)
  }
  throw new TypeError(`${basePath.join('.')}.${method} is not a function`)
}
