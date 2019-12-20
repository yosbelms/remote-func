const isPrimitive = (v: any) => {
  return v == null || (typeof v !== 'function' && typeof v !== 'object')
}

const getProp = (target: any, property: any) => {
  if (property in target) {
    return proxify(target[property])
  } else {
    return proxify({})
  }
}

export const proxify = (event: any): any => {
  return isPrimitive(event) ? event : new Proxy(event, { get: getProp })
}

const proxyObj = (Obj: any) => {
  const proxy: any = typeof Obj === 'function' ? (...args: any[]) => Obj(...args) : {}
  Object.getOwnPropertyNames(Obj).forEach((name: string) => {
    if (['name', 'length', 'prototype'].find(v => v === name)) return
    const propValue = Obj[name]
    proxy[name] = typeof propValue === 'function' ? propValue.bind(Obj) : propValue
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

const builtInsShadow = builtIns.reduce((acc: { [k: string]: any }, key) => {
  acc[key] = null
  return acc
}, {})


export const proxies = {
  ...builtInsShadow,

  Promise: proxyObj(Promise),

  console: proxyObj(console),

  Object: proxyObj(Object),
  Date: proxyObj(Date),
  Array: proxyObj(Array),
  Number: proxyObj(Number),
  String: proxyObj(String),

  // errors
  Error: proxyObj(Error),
  EvalError: proxyObj(EvalError),
  RangeError: proxyObj(RangeError),
  ReferenceError: proxyObj(ReferenceError),
  SyntaxError: proxyObj(SyntaxError),
  TypeError: proxyObj(TypeError),
  URIError: proxyObj(URIError),
}

// export const proxies = {
//   ...builtInsShadow,

//   Promise: PromiseProxy,

//   console: proxify(console),

//   Object: proxify(Object),
//   Date: proxify(Date),
//   Array: proxify(Array),
//   Number: proxify(Number),
//   String: proxify(String),

//   // errors
//   Error: proxify(Error),
//   EvalError: proxify(EvalError),
//   RangeError: proxify(RangeError),
//   ReferenceError: proxify(ReferenceError),
//   SyntaxError: proxify(SyntaxError),
//   TypeError: proxify(TypeError),
//   URIError: proxify(URIError),
// }
