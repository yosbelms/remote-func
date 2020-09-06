import { createRpcCommand } from "../server/rpc"

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

export interface Func {
  <T extends Function>(fn: T): T
  (tsa: TemplateStringsArray): RemoteFunction
  (str: string): RemoteFunction
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
export const func: Func = (sourceInput: TemplateStringsArray | Function | string): RemoteFunction => {
  if (typeof sourceInput === 'string') {
    sourceInput = sourceInput
  } else if (Array.isArray(sourceInput)) {
    sourceInput = sourceInput.join('')
  } else if (typeof sourceInput === 'function') {
    throw new Error(`wrong use of 'func', use the bundled babel plugin`)
  } else {
    throw new Error(`wrong use of 'func', unsupported source type`)
  }
  return createRemoteFunc(sourceInput)
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
  const boundRemoteFunction = (...args: any[]) => client.request(source, args)
  boundRemoteFunction.target = target
  return boundRemoteFunction as unknown as (T & BoundRemoteFunction)
}
