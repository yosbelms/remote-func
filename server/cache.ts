import { mins, secs } from './util'

export interface CacheConfig {
  maxDataCount: number
  maxIddleTime: number
  gcIntervalTime: number
}

export interface CacheEntry<T> {
  data: T
  createdAt: number
  usedAt: number
}

export class Cache<T> {
  private map: Map<string, CacheEntry<T>>
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.map = new Map()

    this.config = {
      maxDataCount: 10000,
      maxIddleTime: mins(10),
      gcIntervalTime: secs(10),
      ...config,
    }

    // start gc
    setInterval(this.runGc, this.config.gcIntervalTime)
  }

  private runGc = () => {
    const { maxDataCount, maxIddleTime } = this.config
    const size = this.map.size
    const garbageKeys: string[] = []
    const now = Date.now()
    const idxEndRemoval = size - maxDataCount
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

  get(key: string): T | void {
    const entry = this.map.get(key)
    if (entry) {
      entry.usedAt = Date.now()
      return entry.data
    }
  }

  set(key: string, data: T) {
    const now = Date.now()
    return this.map.set(key, {
      data,
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
