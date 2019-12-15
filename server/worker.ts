import pDefer from 'p-defer'
import deepFreeze from 'deep-freeze'
import path from 'path'
import minimatch from 'minimatch'
import { parentPort, workerData, MessagePort, isMainThread } from 'worker_threads'
import { Script } from 'vm'
import { createConsole } from './util'
import { MessageType, ResponseMessage, ExecuteMessage, ReturnMessage, ErrorMessage, RequestMessage } from './message'
import { ErrorType } from './error'
import { createApiClient } from './api'

const defaultFileName = '<remote-func:worker>'

export interface WorkerConfig {
  parentPort: MessagePort | null,
  workerData: any
}

export class Worker {
  private parentPort: MessagePort | null
  private requestIdSeed: number
  private pendingRequestsDeferredPromises: Map<number, any>
  private scriptCache: Map<string, any>
  private console: Partial<Console>
  private filename: string
  private dirname: string
  private workerData: any
  private injectedApi: any

  constructor(config: Partial<WorkerConfig>) {
    const cfg = {
      workerData: void 0,
      parentPort: null,
      ...config,
    }

    this.workerData = cfg.workerData
    this.parentPort = cfg.parentPort

    this.requestIdSeed = 0
    this.filename = defaultFileName
    this.console = createConsole()
    this.scriptCache = new Map()
    this.pendingRequestsDeferredPromises = new Map()
    this.injectedApi = {}

    if (workerData) {
      if (typeof workerData.filename === 'string') {
        this.filename = workerData.filename
      }
      this.injectedApi = deepFreeze(
        createApiClient(
          workerData.serializedApi,
          this.createApiClientFunction,
        )
      )
    }

    this.dirname = path.dirname(this.filename)

    if (this.parentPort) {
      this.parentPort.on('message', this.handleMainThreadMessage)
    }
  }

  private sendMessage = (msg: any) => {
    return this.parentPort ? this.parentPort.postMessage(msg) : void 0
  }

  private createApiClientFunction = (method: string, basePath: string[]) => {
    return (...args: any[]) => {
      const id = this.requestIdSeed++
      const deferredPromise = pDefer()
      this.pendingRequestsDeferredPromises.set(id, deferredPromise)
      this.sendMessage({
        type: MessageType.REQUEST,
        basePath,
        method,
        args,
        id,
      } as RequestMessage)
      return deferredPromise.promise
    }
  }

  private handleMainThreadMessage = (message: any) => {
    // console.log('WORKER', message)
    switch (message.type) {
      case MessageType.RESPONSE:
        const { id, result } = message as ResponseMessage
        this.pendingRequestsDeferredPromises.get(id).resolve(result)
        this.pendingRequestsDeferredPromises.delete(id)
        break
      case MessageType.EXECUTE:
        const { source, args = [] } = message as ExecuteMessage
        this.pendingRequestsDeferredPromises.forEach(p => p.reject())
        this.pendingRequestsDeferredPromises.clear()

        let script = this.scriptCache.get(source)
        if (!script) {
          try {
            script = this.compile(source)
            this.scriptCache.set(source, script)
          } catch (err) {
            const { message, stack } = err
            this.sendMessage({
              type: MessageType.ERROR,
              errorType: ErrorType.EVAL,
              message,
              stack,
            })
            break
          }
        }

        this.runScript(script, args).then(res => {
          this.sendMessage({
            type: MessageType.RETURN,
            result: res,
          } as ReturnMessage)
        }).catch(err => {
          const { message, stack } = err || {}
          this.sendMessage({
            type: MessageType.ERROR,
            errorType: ErrorType.RUNTIME,
            message,
            stack,
          } as ErrorMessage)
        })
        break
    }
  }

  private async runScript(script: any, args: any[]) {
    const ctx = {
      console: this.console,
      ...this.injectedApi,
      isWorker: true,
      require: this.require,
      __filename: this.filename,
      __dirname: this.dirname,
      exports: Object.create(null),
    }
    script.runInNewContext(ctx, { displayErrors: true })
    const mainfn = ctx.exports.__mainfn
    if (typeof mainfn !== 'function') throw new Error('invalid function')
    return mainfn.apply(null, args)
  }

  private compile(source: string) {
    return new Script(`'use strict'; exports.__mainfn = ${source}`, {
      filename: this.filename,
    })
  }

  private require = (modulePath: string) => {
    const { allowedModules } = this.workerData
    const isRelative = ~modulePath.indexOf(path.sep)
    let realPath = modulePath

    if (!allowedModules.some((pattern: string) => minimatch(modulePath, pattern))) {
      throw new Error(`'${modulePath}' module not allowed`)
    }

    if (isRelative) {
      if (this.filename === '') throw new Error(`empty module filename`)
      realPath = path.resolve(this.dirname, modulePath)
    }

    return require(realPath)
  }
}

export const createWorker = (config: Partial<WorkerConfig> = {}): Worker => {
  return new Worker(config)
}

// bootstrap
if (!isMainThread) {
  createWorker({ parentPort, workerData })
}
