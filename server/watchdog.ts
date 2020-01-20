import { mins } from './util'
import { TimeoutError } from './error'

enum CheckType {
  Sync,
  Async,
}

interface WatchdogConfig {
  maxRunningTime: number
  maxSyncRunningTime: number
}

export class Watchdog {
  private config: WatchdogConfig
  private beginTimestamp: number
  private runtimeError: Error | void = void 0
  private lastAsyncCheckTimestamp: number
  private lastCheck: CheckType

  constructor(config: Partial<WatchdogConfig>) {
    this.config = {
      maxRunningTime: mins(10),
      maxSyncRunningTime: 100,
      ...config,
    }

    this.beginTimestamp = Date.now()
    this.lastAsyncCheckTimestamp = this.beginTimestamp
    this.lastCheck = CheckType.Async
  }

  private throwTimeoutError() {
    this.runtimeError = new TimeoutError('Timeout')
    throw this.runtimeError
  }

  checkSync() {
    if (this.runtimeError) this.throwTimeoutError()

    const now = Date.now()
    const { maxSyncRunningTime, maxRunningTime } = this.config
    if (
      this.lastCheck === CheckType.Sync
      && ((now - this.lastAsyncCheckTimestamp > maxSyncRunningTime) || (now - this.beginTimestamp > maxRunningTime))
    ) {
      this.throwTimeoutError()
    }
    this.lastCheck = CheckType.Sync
  }

  checkAsync() {
    if (this.runtimeError) this.throwTimeoutError()

    let ret
    const now = Date.now()
    const { maxRunningTime, maxSyncRunningTime } = this.config
    if (now - this.beginTimestamp > maxRunningTime) {
      this.throwTimeoutError()
    }

    if (now - this.lastAsyncCheckTimestamp > maxSyncRunningTime) {
      ret = schedule()
    }

    this.lastAsyncCheckTimestamp = now
    this.lastCheck = CheckType.Async

    return ret
  }
}

const schedule = () => new Promise(resolve => setImmediate(resolve))

export const createWatchdog = (config: Partial<WatchdogConfig>) => {
  return new Watchdog(config)
}
