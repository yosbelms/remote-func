interface Client {
  request(source: string, args: any[]): any
}

export interface RemoteFunction extends Function {
  (...args: any[]): any
  isRemoteFunction: boolean
  client?: Client
  source?: string
}

const stringifySourceInput = (statics: TemplateStringsArray | Function | string): string => {
  const _type = typeof statics
  if (_type === 'function') return statics.toString()
  if (_type === 'string') return statics as string
  if (Array.isArray(statics)) return statics.join('')
  return ''
}

const createRemoteFunc = (source: string): RemoteFunction => {
  const remoteFunction: RemoteFunction = (...args: any[]): any => {
    const client = remoteFunction.client
    if (client) return client.request(source, args)
    throw new Error('no bound client')
  }
  remoteFunction.isRemoteFunction = true
  remoteFunction.source = source
  return remoteFunction
}

export function func<T extends Function>(statics: T): T;
export function func(statics: TemplateStringsArray | Function | string): Function {
  const source = stringifySourceInput(statics)
  return createRemoteFunc(source)
}
