import { Script } from 'vm'
import deepFreeze from 'deep-freeze'
import delay from 'delay'
import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { secs, createConsole, mins } from './util'
import { ErrorType, EvalError, ExitError, RuntimeError, TimeoutError } from './error'
import { serializeApi, callInApi, readApiModule } from './api'
import { FunctionCache } from './function-cache'
import { transform } from './source-processor'
import { createFunctionRuntime } from './function-runtime'

export interface RunnerConfig {
  apiModule: any
  api: any
  middlewares: Middleware<any>[]
  timeout: number
  filename: string
  hashMap: { [k: string]: string }
}

export class Runner {
  private config: Partial<RunnerConfig>
  private functionCache: FunctionCache
  private hashMap: Map<string, string>
  private middlewares: Middleware<any>[]
  private composedMiddleware?: ComposedMiddleware<any>
  private console: Partial<Console>

  constructor(config: Partial<RunnerConfig>) {
    const apiModule = config.apiModule ? readApiModule(config.apiModule) : void 0

    this.config = {
      timeout: secs(15),
      middlewares: [],
      api: apiModule ? apiModule.api : Object.create(null),
      hashMap: {},
      ...config,
    }

    this.functionCache = new FunctionCache()
    this.config.api = deepFreeze(this.config.api)
    this.console = createConsole()
    this.hashMap = new Map(Object.entries(this.config.hashMap || {}))
    this.middlewares = []
  }

  use(middleware: Middleware<any>) {
    this.composedMiddleware = void 0
    this.middlewares.push(middleware)
  }

  async run(sourceOrHash: string, args?: any[], context?: any): Promise<any> {
    let source = sourceOrHash
    if (!this.composedMiddleware) {
      this.composedMiddleware = koaCompose(this.middlewares)
    }

    if (this.hashMap.size > 0) {
      if (this.hashMap.has(sourceOrHash)) {
        source = this.hashMap.get(sourceOrHash) || ''
      } else {
        throw new EvalError(`unknown source: ${sourceOrHash}`)
      }
    }

    const next = () => this.execute(source, args)
    return this.composedMiddleware(context, next)
    // return this.execute(source, args)
  }

  private execute(source: string, args?: any[]) {
    let fn = this.functionCache.get(source)
    if (!fn) {
      try {
        const trasformedSource = transform(source)
        console.log(trasformedSource)

        const script = new Script(`'use strict'; exports.default = ${trasformedSource}`, {
          filename: 'remote-func:vm',
        })

        const ctx = {
          ...this.config.api,
          ...builtInsShadow,

          createFunctionRuntime: proxify(createFunctionRuntime),
          console: proxify(console),

          // primitive
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

          // export
          exports: Object.create(null),
        }

        script.runInNewContext(ctx, {
          displayErrors: true,
          timeout: this.config.timeout,
          breakOnSigint: true,
        })

        fn = ctx.exports.default
        this.functionCache.set(source, fn as Function)
      } catch (err) {
        throw err
      }
    }
    return (fn as Function).apply(null, args)
  }
}

export const createRunner = (config: Partial<RunnerConfig> = {}): Runner => {
  return new Runner(config)
}

function proxify(event: any): any {
  return isPrimitive(event) ? event : new Proxy(event, { get: getProp })
}

function isPrimitive(v: any) {
  return v == null || (typeof v !== 'function' && typeof v !== 'object')
}

function getProp(target: any, property: any) {
  if (property in target) {
    return proxify(target[property])
  } else {
    return proxify({})
  }
}

// class PDate {
//   date: Date

//   constructor(...args: any[]) {
//     this.date = new Date(args[0])
//   }

//   toJSON(key?: any) {
//     return this.date.toJSON(key)
//   }

//   static now() {
//     return Date.now()
//   }
// }

// deepFreeze(PDate)
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
