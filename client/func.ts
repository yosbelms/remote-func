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

const stringifySourceInput = (statics: TemplateStringsArray | Function | string): string => {
  const _type = typeof statics
  if (_type === 'function') return statics.toString()
  if (_type === 'string') return statics as string
  if (Array.isArray(statics)) return statics.join('')
  return ''
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

export const func: Func = (statics: TemplateStringsArray | Function | string): RemoteFunction => {
  const source = stringifySourceInput(statics)
  return createRemoteFunc(source)
}

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
