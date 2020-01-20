import { mins, secs } from './util'

export interface FunctionCacheConfig {
  maxFunctionsCount: number
  maxIddleTime: number
  gcIntervalTime: number
}

export interface FunctionCacheEntry {
  fn: Function
  createdAt: number
  usedAt: number
}

export class FunctionCache {
  private map: Map<string, FunctionCacheEntry>
  private config: FunctionCacheConfig

  constructor(config: Partial<FunctionCacheConfig> = {}) {
    this.map = new Map()

    this.config = {
      maxFunctionsCount: 10000,
      maxIddleTime: mins(10),
      gcIntervalTime: secs(10),
      ...config,
    }

    // start gc
    setInterval(this.runGc, this.config.gcIntervalTime)
  }

  private runGc = () => {
    const { maxFunctionsCount, maxIddleTime } = this.config
    const size = this.map.size
    const garbageKeys: string[] = []
    const now = Date.now()
    const idxEndRemoval = size - maxFunctionsCount
    let count = 0

    this.map.forEach((entry, key) => {
      if (count <= idxEndRemoval) {
        // extra
        garbageKeys.push(key)
      }
      if (now - entry.usedAt >= maxIddleTime) {
        // iddle
        garbageKeys.push(key)
      }
      count++
    })

    // remove garbage
    garbageKeys.forEach(key => this.delete(key))
  }

  get(key: string): Function | void {
    const entry = this.map.get(key)
    if (entry) {
      entry.usedAt = Date.now()
      return entry.fn
    }
  }

  set(key: string, fn: Function) {
    const now = Date.now()
    return this.map.set(key, {
      fn,
      createdAt: now,
      usedAt: now
    })
  }

  delete(key: string) {
    return this.map.delete(key)
  }

  size() {
    return this.map.size
  }
}
