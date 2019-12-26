import { mins } from './util'
import { RuntimeError } from './error'

enum CheckType {
  Sync,
  Async,
}

interface FunctionRuntimeConfig {
  maxRunningTime: number
  maxSyncRunningTime: number
}

export class FunctionRuntime {
  private config: FunctionRuntimeConfig
  private beginTimestamp: number
  private runtimeError: Error | void = void 0
  private lastAsyncCheckTimestamp: number
  private lastCheck: CheckType

  constructor(config: Partial<FunctionRuntimeConfig>) {
    this.config = {
      maxRunningTime: mins(10),
      maxSyncRunningTime: 100,
      ...config,
    }

    this.beginTimestamp = Date.now()
    this.lastAsyncCheckTimestamp = this.beginTimestamp
    this.lastCheck = CheckType.Async
  }

  private throwRuntimeError() {
    this.runtimeError = new RuntimeError('Timeout')
    throw this.runtimeError
  }

  checkSync() {
    if (this.runtimeError) this.throwRuntimeError()

    const now = Date.now()
    const { maxSyncRunningTime, maxRunningTime } = this.config
    if (
      this.lastCheck === CheckType.Sync
      && ((now - this.lastAsyncCheckTimestamp > maxSyncRunningTime) || (now - this.beginTimestamp > maxRunningTime))
    ) {
      this.throwRuntimeError()
    }
    this.lastCheck = CheckType.Sync
  }

  checkAsync() {
    if (this.runtimeError) this.throwRuntimeError()

    let ret
    const now = Date.now()
    const { maxRunningTime, maxSyncRunningTime } = this.config
    if (now - this.beginTimestamp > maxRunningTime) {
      this.throwRuntimeError()
    }

    if (now - this.lastAsyncCheckTimestamp > maxSyncRunningTime) {
      ret = schedule()
    }

    this.lastAsyncCheckTimestamp = now
    this.lastCheck = CheckType.Async

    return ret
  }
}

const schedule = () => {
  return new Promise(resolve => setImmediate(resolve))
}

export const createFunctionRuntime = (config: Partial<FunctionRuntimeConfig>) => {
  return new FunctionRuntime(config)
}
