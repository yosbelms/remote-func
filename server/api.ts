import { isFunction, deepClone, DeepClone, readOnly } from './util'
import { isPrimitive } from 'util'

const ENDPOINT_TOKEN = '@@token/endpoint'

export type Result<T> = DeepClone<T>

export const readModule = <T extends { [k: string]: any }>(mod: T): T => {
  if (!mod) {
    throw new Error('invalid module')
  }
  if (mod.default !== void 0) {
    throw new Error('api modules should not export default')
  }
  return { ...mod }
}

export const endpoint = <C, F extends Function>(fn: (ctx: C) => F) => {
  (fn as any)[ENDPOINT_TOKEN] = true
  return fn as unknown as F
}

export const isEndpoint = (fn: Function) => {
  return (fn as any)[ENDPOINT_TOKEN]
}

export const contextifyApi = <T>(api: T, context?: any): T => {
  const traps = {
    get(target: any, prop: any, receiver: any): any {
      const value = Reflect.get(target, prop, receiver)
      if (isPrimitive(value)) {
        return value
      } else if (isFunction(value)) {
        let fn = value.bind(target)
        if (isEndpoint(value)) {
          fn = fn(context)
        }
        return (...args: any[]) => deepClone(fn(...args))
      }
      return readOnly(value, traps)
    },
  }
  return readOnly(api, traps)
}
