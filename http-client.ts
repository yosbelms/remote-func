export interface ClientConfig {
  url: string
}

interface RemoteFunction extends Function {
  (...args: any[]): any
  isRemoteFunction: boolean
  client?: Client
  source?: string
}

export class Client {
  config: ClientConfig
  constructor(config: Partial<ClientConfig> = {}) {
    let url = 'http://localhost/'
    if (global && (global as any).location) {
      url = (global as any).location
    }
    this.config = {
      url,
      ...config,
    }
  }

  register(functions: any[]) {
    functions.forEach((fn: RemoteFunction) => {
      if (typeof fn === 'function' && fn.isRemoteFunction) {
        fn.client = this
      }
    })
  }

  async request(source: string, args: any[]) {
    const { url } = this.config
    const body = JSON.stringify({ source, args })
    const headers = { 'Content-Type': 'application/json' }
    const response = await fetch(url, { method: 'POST', headers, body })
    return response.json()
  }

  call(fn: RemoteFunction, ...args: any[]) {
    const client = fn.client
    fn.client = this
    const result = fn.apply(null, args)
    fn.client = client
    return result
  }
}

let defaultClient: Client = new Client()
export const getClient = () => defaultClient
export const setClient = (client: Client) => {
  defaultClient = client
}

const stringifySourceInput = (statics: TemplateStringsArray | Function | string): string => {
  const _type = typeof statics
  if (_type === 'function') return statics.toString()
  if (_type === 'string') return statics as string
  if (Array.isArray(statics)) return statics.join('')
  return ''
}

export const createRemoteFunc = (source: string): RemoteFunction => {
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
