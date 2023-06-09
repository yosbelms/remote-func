import mimicFn from 'mimic-fn'
import { createPartialFunc } from '../server/partial-func'
import { createRpcCommand } from '../server/rpc'

interface Client {
  request(source: string, args: any[]): any
}

// example: /filename.ts:10:20
export type SourceLocation = string

export interface RemoteFunction extends Function {
  (...args: any[]): any
  isRemoteFunction?: boolean
  client?: Client
  source?: string
  bound?: boolean
  sourceLoc?: SourceLocation
}

export interface BoundRemoteFunction extends Function {
  remoteFunction: RemoteFunction
}

export interface Func {
  <T extends Function>(fn: T): T
  (tsa: TemplateStringsArray): RemoteFunction
  (str: string): RemoteFunction

  // auto bind types
  <T extends Function>(client: Client, fn: T): (T & BoundRemoteFunction)
  (client: Client, tsa: TemplateStringsArray): RemoteFunction
  (client: Client, str: string): RemoteFunction
}

const createRemoteFunc = (source: string, sourceLoc?: SourceLocation): RemoteFunction => {
  const remoteFunction = () => {
    throw new Error('Unbound remote function')
  }
  remoteFunction.isRemoteFunction = true
  remoteFunction.source = source
  remoteFunction.bound = false
  remoteFunction.sourceLoc = sourceLoc
  return remoteFunction as RemoteFunction
}

/** Bind a service to a client in such way that the service can be used outside of a query function through RPC */
const bindServiceRpc = <T>(client: Client, serviceName: string): T => {
  const binds: any = {}
  return new Proxy({}, {
    get(target: any, prop: any, receiver: any): any {
      if (!binds.hasOwnProperty(prop)) {
        // binds[prop] = bind(client, func(`async (...args) => ${serviceName}.${prop}(...args)`))
        binds[prop] = bind(client, func(createRpcCommand(serviceName, prop)))
      }
      return binds[prop]
    }
  })
}

/** Create a new remote function */
export const func: Func = (client: Client | TemplateStringsArray | Function | string, sourceInput?: TemplateStringsArray | Function | string, sourceLoc?: SourceLocation): RemoteFunction => {
  let _client: any
  let _sourceInput: typeof sourceInput
  let _sourceLoc: SourceLocation | undefined

  if (client && (client as Client).request) {
    _client = client
    _sourceInput = sourceInput
    _sourceLoc = sourceLoc
  } else {
    _client = void 0
    _sourceInput = client as typeof sourceInput
    _sourceLoc = sourceInput as unknown as SourceLocation
  }

  if (typeof _sourceInput === 'string') {
    _sourceInput = _sourceInput
  } else if (Array.isArray(_sourceInput)) {
    _sourceInput = _sourceInput.join('')
  } else if (typeof _sourceInput === 'function') {
    throw new Error(`wrong use of 'func', use the bundled babel plugin`)
  } else {
    throw new Error(`wrong use of 'func', unsupported source type`)
  }

  const remoteFunc = createRemoteFunc(_sourceInput, _sourceLoc)
  if (_client) {
    return bind(_client, remoteFunc)
  }
  return remoteFunc
}


/** Bind a remote function to a client */
export function bind<T>(client: Client, serviceName: string): T;
export function bind<T>(client: Client, remoteFunction: T & RemoteFunction): T & BoundRemoteFunction;
export function bind<T>(client: any, target: any): any {
  if (!client) {
    throw new Error('Invalid client')
  }

  if (typeof target === 'string') {
    return bindServiceRpc(client, target)
  }

  if (!target || !target.isRemoteFunction) {
    throw new Error('Invalid remote function')
  }
  if (target.bound) {
    throw new Error('Remote function already bound')
  }
  const source = target.source as string
  const sourceLoc = target.sourceLoc
  const boundRemoteFunction = (...args: any[]) => {
    const _args = (args || []).map((arg: RemoteFunction) => {
      if (typeof arg === 'function' && arg.isRemoteFunction) {
        return createPartialFunc(arg.source as string)
      }
      return arg
    })
    return client.request(source, _args, sourceLoc)
  }

  mimicFn(boundRemoteFunction, target)
  boundRemoteFunction.target = target
  return boundRemoteFunction as unknown as (T & BoundRemoteFunction)
}
