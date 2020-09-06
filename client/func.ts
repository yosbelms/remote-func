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
export const bind = <T>(client: Client, remoteFunction: T & RemoteFunction): T & BoundRemoteFunction => {
  if (!client) {
    throw new Error('Invalid client')
  }
  if (!remoteFunction || !remoteFunction.isRemoteFunction) {
    throw new Error('Invalid remote function')
  }
  if (remoteFunction.bound) {
    throw new Error('Remote function already bound')
  }
  const source = remoteFunction.source as string
  const boundRemoteFunction = (...args: any[]) => client.request(source, args)
  boundRemoteFunction.remoteFunction = remoteFunction
  return boundRemoteFunction as unknown as (T & BoundRemoteFunction)
}

/** Bind a service to a client in such way that the service can be used outside of a query function */
export const externalBind = (client: Client, serviceName: string) => {
  const binds: any = {}
  const proxy = new Proxy({}, {
    get(target: any, prop: any, receiver: any): any {
      if (!binds.hasOwnProperty(prop)) {
        binds[prop] = bind(client, func(`async (...args) => ${serviceName}.${prop}(...args)`))
      }
      return binds[prop]
    }
  })
  return proxy
}
