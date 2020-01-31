import pDefer, { DeferredPromise } from 'p-defer'
import { RemoteFunction } from './func'
import { createParser, createStringifier } from './json-stream'
import { RequestMessage, ResponseMessage } from './message'

type Fetch = (
  url: string,
  options: {
    method?: string,
    headers?: { [key: string]: string },
    body?: any
  }
) => Promise<any>

export interface ClientConfig {
  url: string
  dedupe: boolean
  fetch: Fetch
}

export interface BatchConfig {
  timeout: number
  sizeLimit: number
}

const MAX_BATCH_SIZE_LIMIT = 1000

const supportsWebStreams = (
  typeof (global as any).ReadableStream !== 'undefined'
  && typeof (global as any).TextDecoder !== 'undefined'
)

const handleResponse = (deferredPromises: DeferredPromise<any>[]) => (resp: ResponseMessage) => {
  const deferredPromise = deferredPromises[resp.index]
  if (resp && resp.error === void 0) {
    deferredPromise.resolve(resp.result)
  } else {
    deferredPromise.reject(resp.error)
  }
}

const handleResponseError = (err: any, str: string) => {
  console.log(err + str)
}

const handleFetchStreamResponse = (
  response: Response,
  deferredPromises: DeferredPromise<any>[],
) => {
  if (response.status === 207) {
    const parser = createParser({
      onData: handleResponse(deferredPromises),
      onError: handleResponseError
    })
    const textDecoder = new TextDecoder()
    const reader = response.body?.getReader()
    const readChunk = (result: ReadableStreamReadResult<Uint8Array>) => {
      if (result.done) {
        parser.close()
      } else {
        parser.write(textDecoder.decode(result.value))
        reader?.read().then(readChunk)
      }
    }
    reader?.read().then(readChunk)
  }
}

const handleFetchNoStreamResponse = (
  response: Response,
  deferredPromises: DeferredPromise<any>[],
) => {
  if (response.status === 207) {
    const parser = createParser({
      onData: handleResponse(deferredPromises),
      onError: handleResponseError
    })
    response.text().then((json: string) => {
      parser.write(json)
      parser.close()
    })
  }
}

const handleFetchResponse = (supportsWebStreams
  ? handleFetchStreamResponse
  : handleFetchNoStreamResponse
)

export class Client {
  private config: ClientConfig
  private isUsingBatch: boolean
  private batchedRequests: RequestMessage[]
  private batchedRequestsDeferredPromises: DeferredPromise<any>[]
  private requestPromiseDedupeMap: Map<string, Promise<ResponseMessage>>
  private batchConfig?: BatchConfig
  private batchScheduleTimeout?: any

  constructor(config: Partial<ClientConfig> = {}) {
    let url = 'http://localhost/'
    let globalFetch
    if (global && (global as any).location) {
      url = (global as any).location
      globalFetch = (global as any).fetch
    }
    this.config = {
      url,
      dedupe: true,
      fetch: globalFetch,
      ...config as ClientConfig,
    }
    this.isUsingBatch = false
    this.batchedRequests = []
    this.batchedRequestsDeferredPromises = []
    this.requestPromiseDedupeMap = new Map()
  }

  private unscheduleBatch() {
    clearTimeout(this.batchScheduleTimeout)
    this.batchScheduleTimeout = void 0
  }

  private scheduleBatch(timeout?: number) {
    this.unscheduleBatch()
    let schedule = Number(timeout) >= 0 ? (fn: any) => setTimeout(fn, timeout) : () => Infinity
    this.batchScheduleTimeout = (schedule as Function)(this.flush.bind(this))
  }

  request(source: string, args: any[]): Promise<ResponseMessage> {
    const { dedupe } = this.config
    const idx = this.batchedRequests.length
    const deferredPromise = pDefer<ResponseMessage>()
    const dedupeKey = source + JSON.stringify(args)
    const existingPromise = this.requestPromiseDedupeMap.get(dedupeKey)
    const request = {
      index: idx,
      source,
      args
    }

    if (dedupe && existingPromise) {
      existingPromise.then(deferredPromise.resolve)
      existingPromise.catch(deferredPromise.reject)
    } else {
      this.batchedRequests[idx] = request
      this.batchedRequestsDeferredPromises[idx] = deferredPromise
      this.requestPromiseDedupeMap.set(dedupeKey, deferredPromise.promise)
    }

    if (this.isUsingBatch) {
      const sizeLimit = Math.min(Number(this.batchConfig?.sizeLimit), MAX_BATCH_SIZE_LIMIT)
      if (this.batchedRequests.length >= sizeLimit) {
        this.flush()
      } else if (this.batchScheduleTimeout === void 0) {
        this.scheduleBatch(this.batchConfig?.timeout)
      }
    } else {
      this.flush()
    }

    return deferredPromise.promise.then((result) => {
      this.requestPromiseDedupeMap.delete(dedupeKey)
      return result
    }, (reason) => {
      this.requestPromiseDedupeMap.delete(dedupeKey)
      throw reason
    })
  }

  flush() {
    if (this.batchedRequests.length === 0) return
    this.unscheduleBatch()

    const { url, fetch } = this.config
    const requests = this.batchedRequests
    const deferredPromises = this.batchedRequestsDeferredPromises
    const headers = {
      'Content-Type': 'text/plain;charset=utf-8',
      'Supports-Web-Streams': supportsWebStreams ? '1' : '0',
    }
    // reset
    this.batchedRequests = []
    this.batchedRequestsDeferredPromises = []
    let body = ''

    const strigifier = createStringifier({ onData: (str: string) => body += str })
    requests.forEach(r => strigifier.write(r))

    fetch(url, { method: 'POST', headers: headers, body }).then((response: Response) => {
      handleFetchResponse(response, deferredPromises)
    }).catch((err) => {
      // handle network error
      console.log(err)
    })
  }

  useBatch(config: Partial<BatchConfig> | boolean) {
    this.flush()
    this.isUsingBatch = !!config
    config = typeof config === 'boolean' ? {} : config
    this.batchConfig = {
      timeout: -1,
      sizeLimit: MAX_BATCH_SIZE_LIMIT,
      ...config,
    }
  }

  bind(functions: any[]) {
    functions.forEach((fn: RemoteFunction) => {
      if (typeof fn === 'function' && fn.isRemoteFunction) {
        fn.client = this
      }
    })
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
