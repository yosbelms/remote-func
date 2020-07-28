export const identity = (a: any) => a
export const noop = () => { }
export const secs = (s: number) => s * 1000
export const mins = (m: number) => secs(m) * 60

export const isObject = (obj: any) => typeof obj === 'object' && obj !== null
export const isFunction = (fn: any) => typeof fn === 'function'
export const isPrimitive = (v: any) => v == null || (!isFunction(v) && !isObject(v))
export const isThenable = (v: any) => v && isFunction(v.then)
export const isArray = Array.isArray.bind(Array)
export const isString = (v: any) => typeof v === 'string'
export const isProduction = () => {
  const { NODE_ENV } = process.env
  return NODE_ENV === 'production'
}
export const getConsole = () => (isProduction()
  ? { log: noop, warn: noop, error: noop }
  : console
)

export const readOnlyTraps = {
  construct(target: any, args: any[]): any {
    return readOnly(new target(...args))
  },
  get(target: any, prop: any, receiver: any): any {
    return readOnly(Reflect.get(target, prop, receiver))
  },
  set(target: any, prop: any, val: any) {
    return val
  },
}

export const readOnly = <T>(target: T, traps: { [k: string]: Function } = {}): T => {
  return new Proxy(target, { ...readOnlyTraps, ...traps })
}

export const deepMap = (
  obj: any,
  mapperFunction: (value: any, container: any, path: string[]) => any,
  path: string[] = [],
) => {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    let newPath = [...path, key]
    if (isObject(value) || Array.isArray(value)) {
      result[key] = deepMap(value, mapperFunction, [...newPath])
    } else {
      result[key] = mapperFunction(value, obj, [...newPath])
    }
  }
  return result
}

export type DeepClone<T> = (
  T extends Function ? never :
  T extends (number | string | boolean | symbol | null | undefined | Date) ? T :
  T extends { [prop: string]: any, toJSON(...args: any[]): infer R } ? R :
  T extends Promise<infer R> ? Promise<DeepClone<R>> :
  { [P in keyof T]: DeepClone<T[P]> }
)

const MAX_DEPTH = 100
export const deepClone = <T extends any, R extends DeepClone<T>>(o: T, maxDepth: number = MAX_DEPTH): R => {
  if (maxDepth <= 0) return void 0 as R

  // if not array or object or is null return self
  if (isFunction(o)) return void 0 as R
  if (!isObject(o)) return o as R

  // date
  if ((o as any) instanceof Date) {
    return new Date((o as any).getTime()) as R
  }

  // toJSON
  if (isFunction((o as any).toJSON)) {
    o = (o as any).toJSON()
  }

  // promise
  if (isThenable(o)) {
    return (o as any).then((o: any) => deepClone(o, maxDepth--))
  }

  // array
  if (isArray(o)) {
    let len = (o as any).length
    let newO = []
    for (let i = 0; i < len; i++) {
      newO[i] = deepClone(o[i], maxDepth--)
    }
    return newO as R
  }

  // object
  let newO: any = {}
  for (let propName in o) {
    if ((o as Object).hasOwnProperty(propName)) {
      newO[propName] = deepClone(o[propName], maxDepth--)
    }
  }
  return newO as R
}
