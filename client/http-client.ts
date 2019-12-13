import { RemoteFunction } from './func'

type RequestFunction = (
  url: string,
  headers: { [key: string]: string },
  source: string,
  args: any[]
) => Promise<any>

export interface ClientConfig {
  url: string,
  headers: { [key: string]: string },
  functions: Function[]
  request: RequestFunction
}

export const defaultRequest: RequestFunction = async (
  url: string,
  headers: { [key: string]: string },
  source: string,
  args: any[],
) => {
  const body = JSON.stringify({ source, args })
  const _headers = {
    ...headers,
    'Content-Type': 'application/json',
  }
  const response = await fetch(url, { method: 'POST', headers: _headers, body })
  return response.json()
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
      functions: [],
      request: defaultRequest,
      ...config as ClientConfig,
    }

    this.registerFunctions(this.config.functions)
  }

  private registerFunctions(functions: any[]) {
    functions.forEach((fn: RemoteFunction) => {
      if (typeof fn === 'function' && fn.isRemoteFunction) {
        fn.client = this
      }
    })
  }

  async request(source: string, args: any[]) {
    const { url, headers } = this.config
    return this.config.request(url, headers, source, args)
  }

  call(fn: RemoteFunction, ...args: any[]) {
    const client = fn.client
    fn.client = this
    const result = fn.apply(null, args)
    fn.client = client
    return result
  }
}

export const createClient = (config?: Partial<ClientConfig>): Client => {
  return new Client(config)
}
