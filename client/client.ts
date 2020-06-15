import pDefer, { DeferredPromise } from 'p-defer'
import { RequestMessage, ResponseMessage } from './message'

export interface RequestHandlerInterface {
  getRequests(): RequestMessage[]
  write: (msg: ResponseMessage) => void
  end: (error?: any) => void
}

export interface ClientConfig {
  handler: (iface: RequestHandlerInterface) => void
  deduplicate: boolean
}

export interface BatchConfig {
  timeout: number
  sizeLimit: number
}

const MAX_BATCH_SIZE_LIMIT = 1000

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
    this.config = {
      deduplicate: true,
      ...config,
    } as ClientConfig

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
    let schedule = Number(timeout) >= 0 ? (fn: any) => setTimeout(fn, timeout as number) : () => Infinity
    this.batchScheduleTimeout = schedule(this.flush.bind(this))
  }

  request(source: string, args: any[]): Promise<ResponseMessage> {
    const { deduplicate } = this.config
    const idx = this.batchedRequests.length
    const deferredPromise = pDefer<ResponseMessage>()
    const deduplicateKey = source + JSON.stringify(args)
    const existingPromise = this.requestPromiseDedupeMap.get(deduplicateKey)
    const request: RequestMessage = {
      index: idx,
      source,
      args,
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

  flush() {
    if (this.batchedRequests.length === 0) return
    this.unscheduleBatch()
    const { handler } = this.config
    const requests = this.batchedRequests
    let deferredPromises = this.batchedRequestsDeferredPromises
    // reset
    this.batchedRequests = []
    this.batchedRequestsDeferredPromises = []

    const write = (resp: ResponseMessage) => {
      const index = resp.index
      const deferredPromise = deferredPromises[index]
      deferredPromises = deferredPromises.slice(index, 1)
      if (resp && resp.error === void 0) {
        deferredPromise.resolve(resp.result)
      } else {
        deferredPromise.reject(resp.error)
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

export const createClient = (config?: Partial<ClientConfig>): Client => {
  return new Client(config)
}
