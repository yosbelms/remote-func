import { isFunction, isPrimitive } from 'util'

const getProxyProp = (target: any, property: any) => {
  if (property in target) {
    return proxifyDeep(target[property])
  } else {
    return proxifyDeep({})
  }
}

export const proxifyDeep = (event: any): any => {
  return isPrimitive(event) ? event : new Proxy(event, { get: getProxyProp })
}

const bannedPropNames = ['name', 'length', 'prototype']
const isBannedProperty = (propName: string) => !!bannedPropNames.find(n => n === propName)

const proxify = (Obj: any) => {
  const proxy: any = (isFunction(Obj)
    ? (...args: any[]) => Obj(...args)
    : {}
  )
  Object.getOwnPropertyNames(Obj).forEach((name: string) => {
    if (isBannedProperty(name)) return
    const propValue = Obj[name]
    proxy[name] = isFunction(propValue) ? propValue.bind(Obj) : propValue
  })
  return Object.freeze(proxy)
}

const builtIns = [
  // JavaScript
  'Array',
  'ArrayBuffer',
  'AsyncFunction',
  'Atomics',
  'BigInt',
  'BigInt64Array',
  'BigUint64Array',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Generator',
  'GeneratorFunction',
  'Infinity',
  'Int16Array',
  'Int32Array',
  'Int8Array',
  'InternalError',
  'Intl',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'TypedArray',
  'URIError',
  'Uint16Array',
  'Uint32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'WeakMap',
  'WeakSet',
  'WebAssembly',

  // nodejs
  'Buffer',
  '__dirname',
  '__filename',
  'clearImmediate',
  'clearInterval',
  'clearTimeout',
  'console',
  'exports',
  'global',
  'module',
  'process',
  'queueMicrotask',
  'require',
  'setImmediate',
  'setInterval',
  'setTimeout',
  'TextDecoder',
  'TextEncoder',
  'URL',
  'URLSearchParams',
]

const builtInsShadow = Object.fromEntries(builtIns.map(key => [key, null]))

export const createModuleContextProxies = () => {
  return {
    ...builtInsShadow,

    Promise: proxify(Promise),

    console: proxify(console),

    Object: proxify(Object),
    Date: proxify(Date),
    Array: proxify(Array),
    Number: proxify(Number),
    String: proxify(String),

    // errors
    Error: proxify(Error),
    EvalError: proxify(EvalError),
    RangeError: proxify(RangeError),
    ReferenceError: proxify(ReferenceError),
    SyntaxError: proxify(SyntaxError),
    TypeError: proxify(TypeError),
    URIError: proxify(URIError),
  }
}
