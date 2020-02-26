import pDefer, { DeferredPromise } from 'p-defer'
import { mins, isFunction, isObject, isThenable } from '../server/util'
import { TimeoutError, MemoryLimitError } from '../server/error'
import { sizeOf, isProtectedProperty, formatBytes } from './util'

enum CheckType {
  Sync,
  Async,
}

interface RuntimeConfig {
  timeout: number
  syncTimeout: number
  memoryLimit: number
}

export class Runtime {
  private config: RuntimeConfig
  private beginTimestamp: number
  private error: Error | void = void 0
  private lastAsyncCheckTimestamp: number
  private lastCheck: CheckType
  private memorySize: number = 0
  private sizeCache: WeakMap<object, number>

  constructor(config: Partial<RuntimeConfig>) {
    this.config = {
      timeout: mins(10),
      syncTimeout: 100,
      memoryLimit: 1 * 1024 * 1024 * 10, // 10Mb
      ...config,
    }

    this.beginTimestamp = Date.now()
    this.lastAsyncCheckTimestamp = this.beginTimestamp
    this.lastCheck = CheckType.Async
    this.sizeCache = new WeakMap()
  }

  private throwTimeoutError() {
    this.error = new TimeoutError('Timeout error')
    throw this.error
  }

  private throwMemoryLimitError() {
    this.error = new MemoryLimitError(
      `Memory limit error, max: ${formatBytes(this.config.memoryLimit)}, reached: ${formatBytes(this.memorySize)}`
    )
    throw this.error
  }

  checkSync() {
    if (this.error) this.throwTimeoutError()

    const now = Date.now()
    const { syncTimeout, timeout } = this.config
    if (
      this.lastCheck === CheckType.Sync
      && ((now - this.lastAsyncCheckTimestamp > syncTimeout) || (now - this.beginTimestamp > timeout))
    ) {
      this.throwTimeoutError()
    }
    this.lastCheck = CheckType.Sync
  }

  checkAsync() {
    if (this.error) this.throwTimeoutError()

    const now = Date.now()
    const { timeout } = this.config
    if (now - this.beginTimestamp > timeout) {
      this.throwTimeoutError()
    }
    this.lastAsyncCheckTimestamp = now
    this.lastCheck = CheckType.Async
    return new Promise((resolve) => setImmediate(resolve))
  }

  // memory
  sizeOf(value: any): number {
    if (isObject(value)) {
      let size = this.sizeCache.get(value)
      if (size === void 0) {
        size = sizeOf(value)
        this.sizeCache.set(value, size)
      }
      return size
    } else {
      return sizeOf(value)
    }
  }

  alloc(newAlloc: any, oldAlloc: any = void 0, container: any = void 0) {
    const sizeDiff = this.sizeOf(newAlloc) - this.sizeOf(oldAlloc)
    if (isObject(container) && sizeDiff !== 0) {
      this.sizeCache.set(container, this.sizeOf(container) + sizeDiff)
    }
    this.memorySize = this.memorySize + sizeDiff
    if (this.memorySize > this.config.memoryLimit) {
      this.throwMemoryLimitError()
    }
  }

  captureLazyValue(value: any) {
    if (isFunction(value)) {
      return (...args: any[]) => this.captureLazyValue(value(...args))
    } else if (isThenable(value)) {
      return value.then((result: any) => this.captureLazyValue(result))
    } else {
      this.alloc(value)
      return value
    }
  }

  createProxy(obj: any) {
    this.alloc(obj)
    return new Proxy(obj, {
      set: (obj, prop, value, receiver) => {
        this.alloc(value, obj[prop], obj)
        return Reflect.set(obj, prop, value, receiver)
      },
      deleteProperty: (obj: any, prop: any) => {
        this.alloc(void 0, obj[prop], obj)
        delete obj[prop]
        return true
      }
    })
  }

  createArr(arr: any[]) {
    return this.createProxy(arr)
  }

  createObj(obj: any) {
    return this.createProxy(obj)
  }

  getProp(obj: any, prop: any) {
    let val = isProtectedProperty(prop) ? void 0 : obj[prop]
    if (isFunction(val)) {
      val = obj[prop].bind(obj)
    }
    return this.captureLazyValue(val)
  }

  callProp(obj: any, prop: any, ...args: any[]) {
    return isProtectedProperty(prop) ? void 0 : obj[prop](...args)
  }

  setProp(obj: any, prop: any, value: any, operator: string) {
    if (isFunction(value)) {
      throw new Error('Object does not accept function')
    }
    return isProtectedProperty(prop) ? void 0 : obj[prop] = value
  }

  computedProp(prop: string) {
    return isProtectedProperty(prop) ? void 0 : prop
  }
}

export const createRuntime = (config: Partial<RuntimeConfig>) => {
  return new Runtime(config)
}
