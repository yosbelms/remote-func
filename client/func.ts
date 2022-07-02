import mimicFn from 'mimic-fn'
import { createPartialFunc } from '../server/partial-func'
import { createRpcCommand } from '../server/rpc'

interface Client {
  request(source: string, args: any[]): any
}

export interface RemoteFunction extends Function {
  (...args: any[]): any
  isRemoteFunction?: boolean
  client?: Client
  source?: string
  bound?: boolean
}

export interface BoundRemoteFunction extends Function {
  remoteFunction: RemoteFunction
}

const createRemoteFunc = (source: string): RemoteFunction => {
  const remoteFunction = () => {
    throw new Error('Unbound remote function')
  }
  remoteFunction.isRemoteFunction = true
  remoteFunction.source = source
  remoteFunction.bound = false
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
export function func(sourceInput: TemplateStringsArray | Function | string): RemoteFunction;
export function func<RpcT>(client: Client, sourceInput: TemplateStringsArray | Function | string): RpcT & BoundRemoteFunction;
export function func(client: Client | TemplateStringsArray | Function | string, sourceInput?: TemplateStringsArray | Function | string): RemoteFunction {
  let _client: any
  let _sourceInput: typeof sourceInput

  if (client && (client as Client).request) {
    _client = client
    _sourceInput = sourceInput
  } else {
    _client = void 0
    _sourceInput = client as typeof sourceInput
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

  const remoteFunc = createRemoteFunc(_sourceInput)
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
  const boundRemoteFunction = (...args: any[]) => {
    const _args = (args || []).map((arg: RemoteFunction) => {
      if (typeof arg === 'function' && arg.isRemoteFunction) {
        return createPartialFunc(arg.source as string)
      }
      return arg
    })
    return client.request(source, _args)
  }

  mimicFn(boundRemoteFunction, target)
  boundRemoteFunction.target = target
  return boundRemoteFunction as unknown as (T & BoundRemoteFunction)
}
