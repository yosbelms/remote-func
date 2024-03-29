import pDefer, { DeferredPromise } from 'p-defer'
import { SourceLocation } from './func'
import { RequestMessage, ResponseMessage } from './message'
import { noop } from './util'

export interface RequestHandlerInterface {
  getRequests(): RequestMessage[]
  write: (msg: ResponseMessage) => void
  end: (error?: any) => void
}

type Handler = (iface: RequestHandlerInterface) => void

export interface ClientConfig {
  /** Handle requests */
  handler: Handler
  /** Remove duplicated requests in batch mode */
  deduplicate: boolean
  /** Execute on each func response, either result or error */
  response: (resp: ResponseMessage) => void
}

export interface BatchConfig {
  /** Duration (in milliseconds) of batch request gathering before flush */
  timeout: number
  /** Max number of request batched before flush */
  sizeLimit: number
}

const MAX_BATCH_SIZE_LIMIT = 1000

/** Generic client */
export class Client {
  private config: ClientConfig
  private isUsingBatch: boolean
  private batchedRequests: RequestMessage[]
  private batchedRequestsDeferredPromises: DeferredPromise<any>[]
  private requestPromiseDedupeMap: Map<string, Promise<ResponseMessage>>
  private batchConfig?: BatchConfig
  private batchScheduleTimeout?: any

  constructor(config: Partial<ClientConfig> = {}) {
    if (!config.handler) {
      throw new Error('invalid handler')
    }
    this.config = {} as ClientConfig
    this.setConfig(config)
    this.isUsingBatch = false
    this.batchedRequests = []
    this.batchedRequestsDeferredPromises = []
    this.requestPromiseDedupeMap = new Map()
  }

  setConfig(config: Partial<ClientConfig>) {
    this.config = {
      deduplicate: true,
      response: noop,
      ...config,
    } as ClientConfig
  }

  private unscheduleBatch() {
    clearTimeout(this.batchScheduleTimeout)
    this.batchScheduleTimeout = void 0
  }

  private scheduleBatch(timeout?: number) {
    this.unscheduleBatch()
    const _timeout = Number(timeout)
    let schedule = _timeout >= 0 ? (fn: any) => setTimeout(fn, _timeout) : () => Infinity
    this.batchScheduleTimeout = schedule(this.flush.bind(this))
  }

  /** Execute a client request */
  request(source: string, args: any[], sourceLoc?: SourceLocation): Promise<ResponseMessage> {
    const { deduplicate } = this.config
    const idx = this.batchedRequests.length
    const deferredPromise = pDefer<ResponseMessage>()
    const deduplicateKey = source + JSON.stringify(args)
    const existingPromise = this.requestPromiseDedupeMap.get(deduplicateKey)
    const request: RequestMessage = {
      index: idx,
      source,
      args,
      sourceLoc,
    }

    if (deduplicate && existingPromise) {
      existingPromise.then(deferredPromise.resolve)
      existingPromise.catch(deferredPromise.reject)
    } else {
      this.batchedRequests[idx] = request
      this.batchedRequestsDeferredPromises[idx] = deferredPromise
      this.requestPromiseDedupeMap.set(deduplicateKey, deferredPromise.promise)
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

    return deferredPromise.promise.then((result: any) => {
      this.requestPromiseDedupeMap.delete(deduplicateKey)
      return result
    }, (reason: any) => {
      this.requestPromiseDedupeMap.delete(deduplicateKey)
      throw reason
    })
  }

  /** Flush batched requests */
  flush() {
    this.unscheduleBatch()
    if (this.batchedRequests.length === 0) return
    const { handler } = this.config
    const requests = this.batchedRequests
    const deferredPromises = this.batchedRequestsDeferredPromises
    // reset
    this.batchedRequests = []
    this.batchedRequestsDeferredPromises = []

    const write = (resp: ResponseMessage) => {
      const index = resp.index
      const deferredPromise = deferredPromises[index]
      this.config.response(resp)
      if (resp && resp.error === void 0) {
        deferredPromise.resolve(resp.result)
      } else {
        const error = new Error(resp.error?.message)
        error.name = resp.error?.name ?? 'Error'
        deferredPromise.reject(error)
      }
    }

    const end = (reason: any) => {
      deferredPromises.forEach(d => d.reject(reason))
    }

    handler({
      getRequests() {
        return requests
      },
      write,
      end,
    })
  }

  /** Turn batch mode on or off */
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
}

/** Create client instance */
export const createClient = (config?: Partial<ClientConfig>): Client => {
  return new Client(config)
}
