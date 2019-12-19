import delay from 'delay'
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
    const now = Date.now()
    const { maxRunningTime } = this.config
    if (now - this.beginTimestamp > maxRunningTime) {
      this.throwRuntimeError()
    }
    this.lastAsyncCheckTimestamp = now
    this.lastCheck = CheckType.Async
    return delay(0)
  }
}

export const createFunctionRuntime = (config: Partial<FunctionRuntimeConfig>) => {
  return new FunctionRuntime(config)
}

// export const createRuntime = () => {
//   const beginTimestamp = Date.now()
//   const maxRunningTime = mins(10)
//   const maxSyncRunningTime = 100

//   let runtimeError: Error | void = void 0
//   let lastAsyncCheckTimestamp = beginTimestamp
//   let lastCheck: CheckType = CheckType.Async

//   const throwRuntimeError = () => {
//     runtimeError = new RuntimeError('Timeout')
//     throw runtimeError
//   }

//   return {

//     checkSync() {
//       if (runtimeError) throwRuntimeError()
//       const now = Date.now()
//       if (
//         lastCheck === CheckType.Sync
//         && ((now - lastAsyncCheckTimestamp > maxSyncRunningTime) || (now - beginTimestamp > maxRunningTime))
//       ) {
//         throwRuntimeError()
//       }
//       lastCheck = CheckType.Sync
//     },

//     checkAsync() {
//       if (runtimeError) throwRuntimeError()
//       const now = Date.now()
//       if (now - beginTimestamp > maxRunningTime) {
//         throwRuntimeError()
//       }
//       lastAsyncCheckTimestamp = now
//       lastCheck = CheckType.Async
//       return delay(0)
//     }

//   }
// }
