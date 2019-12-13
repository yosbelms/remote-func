import pDefer from 'p-defer'
import koaCompose, { Middleware, ComposedMiddleware } from 'koa-compose'
import { Pool } from './pool'
import { Worker as NodeWorker } from 'worker_threads'
import { secs, mins } from './util'
import { ErrorType, EvalError, ExitError, RuntimeError, TimeoutError } from './error'
import { MessageType, RequestMessage, ReturnMessage, ErrorMessage, ExitMessage, ExecuteMessage, } from './message'
import { serializeApi, callInApi, readApiModule } from './api'

class WorkerWrapper {
  private nodeWorker: NodeWorker
  private context?: any

  constructor(nodeWorker: NodeWorker) {
    this.nodeWorker = nodeWorker
  }

  setContext(ctx: any) {
    this.context = ctx
  }

  getContext() {
    return this.context
  }

  getWorker() {
    return this.nodeWorker
  }
}

const handleMessageFromWorker = (
  pool: Pool<WorkerWrapper>,
  workerWrapper: WorkerWrapper,
  api: any,
  resolve: Function,
  reject: Function,
) => (message: any) => {
  // console.log('RUNNER', message)
  const worker = workerWrapper.getWorker()
  switch (message.type) {
    case MessageType.REQUEST:
      const { basePath, method, args, id } = message as RequestMessage
      const context = workerWrapper.getContext()
      const r = callInApi(api, basePath, method, args, context)
      Promise.resolve(r).then((result) => {
        worker.postMessage({ type: MessageType.RESPONSE, id, result })
      })
      break
    case MessageType.RETURN:
      const { result: res } = message as ReturnMessage
      resolve(res)
      if (pool.isAcquired(workerWrapper)) {
        pool.release(workerWrapper)
      }
      break
    case MessageType.ERROR:
      const { stack, errorType } = message as ErrorMessage
      let err: Error = new Error

      switch (errorType) {
        case ErrorType.EVAL:
          err = new EvalError(stack)
          break
        case ErrorType.RUNTIME:
          err = new RuntimeError(stack)
          break
        case ErrorType.TIMEOUT:
          err = new TimeoutError(stack)
          break
      }

      reject(err)
      if (pool.isAcquired(workerWrapper)) {
        pool.release(workerWrapper)
      }
      break
    case MessageType.EXIT:
      const { code } = message
      reject(new ExitError(`Worker has ended with code ${code}`))
      pool.remove(workerWrapper)
      break
  }
}

export interface RunnerConfig {
  apiModule: any
  api: any
  middlewares: Middleware<any>[]
  maxWorkers: number
  maxWorkersIddleTime: number
  maxWorkersLifeTime: number
  timeout: number
  filename: string
  allowedModules: string[]
  hashMap: { [k: string]: string }
}

export class Runner {
  private config: Partial<RunnerConfig>
  private pool: Pool<WorkerWrapper>
  private hashMap: Map<string, string>
  private middlewares: Middleware<any>[]
  private composedMiddleware?: ComposedMiddleware<any>

  constructor(config: Partial<RunnerConfig>) {
    const apiModule = config.apiModule ? readApiModule(config.apiModule) : void 0

    this.config = {
      timeout: secs(15),
      allowedModules: [],
      middlewares: [],
      maxWorkers: 5,
      maxWorkersIddleTime: mins(1),
      maxWorkersLifeTime: mins(5),
      api: apiModule ? apiModule.api : Object.create(null),
      hashMap: {},
      ...config,
    }

    const {
      api,
      maxWorkers,
      filename,
      allowedModules,
      middlewares,
      maxWorkersIddleTime,
      maxWorkersLifeTime,
      hashMap
    } = this.config

    this.hashMap = new Map(Object.entries(hashMap || {}))
    this.middlewares = middlewares || []

    this.pool = new Pool<WorkerWrapper>({
      maxResorces: maxWorkers,
      maxIddleTime: maxWorkersIddleTime,
      maxLifeTime: maxWorkersLifeTime,

      create() {
        const nodeWorker = new NodeWorker(`${__dirname}/worker.js`, {
          workerData: {
            serializedApi: serializeApi(api),
            filename,
            allowedModules,
          }
        })
        return new WorkerWrapper(nodeWorker)
      },

      beforeAvailable(workerWrapper: WorkerWrapper) {
        workerWrapper.getWorker().removeAllListeners()
      },

      destroy(workerWrapper: WorkerWrapper) {
        const worker = workerWrapper.getWorker()
        return new Promise((resolve, reject) =>
          worker.terminate().then(() => {
            resolve()
            worker.removeAllListeners()
          }).catch((err) => {
            worker.removeAllListeners()
            reject(err)
          })
        )
      },
    })
  }

  public use(middleware: Middleware<any>) {
    this.composedMiddleware = void 0
    this.middlewares.push(middleware)
  }

  private async runInWorker(source: string, args: any[] = [], context?: any, timeout?: number) {
    const _timeout = timeout || this.config.timeout
    const workerWrapper = await this.pool.acquire() as WorkerWrapper
    const worker = workerWrapper.getWorker()
    const { promise, resolve, reject } = pDefer()

    workerWrapper.setContext(context)

    worker.postMessage({
      type: MessageType.EXECUTE,
      source,
      args,
    } as ExecuteMessage)

    const _handleMessageFromWorker = handleMessageFromWorker(
      this.pool,
      workerWrapper,
      this.config.api,
      resolve,
      reject,
    )

    worker.on('message', _handleMessageFromWorker)
    worker.on('error', _handleMessageFromWorker)
    worker.on('exit', (code) => _handleMessageFromWorker({
      type: MessageType.EXIT,
      code
    } as ExitMessage))

    const timer = setTimeout(() => {
      const msg = `Timeout after ${_timeout} milliseconds`
      _handleMessageFromWorker({
        type: MessageType.ERROR,
        errorType: ErrorType.TIMEOUT,
        message: msg,
        stack: msg,
      } as ErrorMessage)
    }, _timeout)

    return promise.then((result) => {
      clearTimeout(timer)
      return result
    }).catch((reason) => {
      clearTimeout(timer)
      throw reason
    })
  }

  async run(sourceOrHash: string, args?: any[], context?: any, timeout?: number): Promise<any> {
    let source = sourceOrHash
    if (!this.composedMiddleware) {
      this.composedMiddleware = koaCompose(this.middlewares)
    }

    if (this.hashMap.size > 0) {
      if (this.hashMap.has(sourceOrHash)) {
        source = this.hashMap.get(sourceOrHash) || ''
      } else {
        throw new EvalError(`unknown source: ${sourceOrHash}`)
      }
    }

    const next = () => this.runInWorker(source, args, context, timeout)
    return await this.composedMiddleware(context, next)
  }

  destroy() {
    return this.pool.destroy()
  }
}

export const createRunner = (config: Partial<RunnerConfig> = {}): Runner => {
  return new Runner(config)
}
