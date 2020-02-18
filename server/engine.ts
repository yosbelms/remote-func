import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { mins, readOnly, getConsole } from './util'
import { EvalError } from './error'
import { readModule, contextifyApi } from './api'
import { Cache } from './cache'
import { createFuntainer, Funtainer } from '../funtainer'

export interface EngineConfig {
  api: any
  middlewares: Middleware<any>[]
  timeout: number
  filename: string
}

export class Engine {
  private config: Partial<EngineConfig>
  private funtainerCache: Cache<Funtainer>
  private composedMiddleware: ComposedMiddleware<any>
  private funtainerGlobalNames: string[]
  private readOnlyNatives: { [k: string]: any }
  private api: any

  constructor(config: Partial<EngineConfig>) {
    this.config = {
      timeout: mins(1),
      ...config,
    }

    this.readOnlyNatives = {
      console: readOnly(getConsole()),

      Promise: readOnly(Promise),
      Object: readOnly(Object),
      Date: readOnly(Date),
      Array: readOnly(Array),
      Number: readOnly(Number),
      String: readOnly(String),

      // errors
      Error: readOnly(Error),
      EvalError: readOnly(EvalError),
      RangeError: readOnly(RangeError),
      ReferenceError: readOnly(ReferenceError),
      SyntaxError: readOnly(SyntaxError),
      TypeError: readOnly(TypeError),
      URIError: readOnly(URIError),
    }

    this.composedMiddleware = koaCompose(this.config.middlewares || [])
    this.funtainerCache = new Cache()
    this.api = readModule(config.api || {})
    this.funtainerGlobalNames = [
      ...Object.keys(this.readOnlyNatives),
      ...Object.keys(this.api),
    ]
  }

  async run(source: string, args?: any[], context?: any): Promise<any> {
    return this.composedMiddleware(context, () => this.execute(source, args, context))
  }

  private execute(source: string, args?: any[], context?: any) {
    let funtainer = this.funtainerCache.get(source)
    if (!funtainer) {
      try {
        funtainer = createFuntainer({
          globalNames: this.funtainerGlobalNames,
          timeout: this.config.timeout,
          source,
        })
        this.funtainerCache.set(source, funtainer)
      } catch (err) {
        throw new EvalError(String(err.stack))
      }
    }

    const contextifedApi = contextifyApi(this.api, context)
    const globals = {
      ...this.readOnlyNatives,
      ...contextifedApi,
    }

    return funtainer(args, globals)
  }
}

export const createEngine = (config: Partial<EngineConfig> = {}): Engine => {
  return new Engine(config)
}
