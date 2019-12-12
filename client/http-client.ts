import { RemoteFunction } from './func'

export interface ClientConfig {
  url: string,
  functions: Function[]
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
      ...config,
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

export const createClient = (config?: ClientConfig): Client => {
  return new Client(config)
}
