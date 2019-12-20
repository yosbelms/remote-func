import { Runner } from './runner'
import { isFunction } from './util'

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
    const init = isFunction(_module.default.init) && _module.default.init
    return {
      namespace: _namespace,
      api: { [_namespace]: api },
      init
    }
  } else {
    throw new Error(`invalid api module`)
  }
}

export const withContext = <C, F>(fn: (ctx: C) => F) => {
  (fn as any)[WITH_CONTEXT_TOKEN] = true
  return fn as unknown as F
}
