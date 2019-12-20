export const identity = (a: any) => a
export const noop = () => { }
export const secs = (s: number) => s * 1000
export const mins = (m: number) => secs(m) * 60

export const isObject = (obj: any) => typeof obj === 'object' && obj !== null
export const isFunction = (fn: any) => typeof fn === 'function'
export const isPrimitive = (v: any) => v == null || (!isFunction(v) && !isObject('object'))

export const deepMap = (obj: any, callback: Function, basePath: string[] = []) => {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (isObject(value) || Array.isArray(value)) {
      result[key] = deepMap(value, callback, [...basePath, key])
    } else {
      result[key] = callback(value, key, [...basePath])
    }
  }
  return result
}
