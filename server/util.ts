export const identity = (a: any) => a
export const noop = () => { }
export const secs = (s: number) => s * 1000
export const mins = (m: number) => secs(m) * 60

export const isObject = (obj: any) => typeof obj === 'object' && obj !== null
export const isFunction = (fn: any) => typeof fn === 'function'
export const isPrimitive = (v: any) => v == null || (!isFunction(v) && !isObject('object'))
export const isThenable = (v: any) => v && isFunction(v.then)
export const isArray = Array.isArray.bind(Array)
export const isString = (v: any) => typeof v === 'string'

export const deepMap = (
  obj: any,
  mapperFunction: (value: any, container: any) => any,
) => {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (isObject(value) || Array.isArray(value)) {
      result[key] = deepMap(value, mapperFunction)
    } else {
      result[key] = mapperFunction(value, obj)
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

export const deepClone = <T extends any, R extends DeepClone<T>>(o: T): R => {
  // if not array or object or is null return self
  if (isFunction(o)) return void 0 as R
  if (!isObject(o)) return o as R

  // date
  if ((o as any) instanceof Date) {
    return new Date(o.getTime()) as R
  }

  // toJSON
  if (isFunction(o.toJSON)) {
    o = o.toJSON()
  }

  // promise
  if (isThenable(o)) {
    return o.then((o: any) => deepClone(o))
  }

  // array
  if (isArray(o)) {
    let len = o.length
    let newO = []
    for (let i = 0; i < len; i++) {
      newO[i] = deepClone(o[i])
    }
    return newO as R
  }

  // object
  let newO: any = {}
  for (let propName in o) {
    if ((o as Object).hasOwnProperty(propName)) {
      newO[propName] = deepClone(o[propName])
    }
  }
  return newO as R
}
