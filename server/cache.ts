import { mins, secs } from './util'

export interface CacheConfig {
  /** Max number of entries to keep in the cache */
  maxEntriesCount: number
  /** Max time an entry can be stored in the cache without being retrieved */
  maxIddleTime: number
  /** Interval (in milliseconds) to run garbage collector*/
  gcIntervalTime: number
}

export interface CacheEntry<T> {
  data: T
  createdAt: number
  usedAt: number
}

/** Cache with garbage collector */
export class Cache<T> {
  private map: Map<string, CacheEntry<T>>
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.map = new Map()

    this.config = {
      maxEntriesCount: 10000,
      maxIddleTime: mins(10),
      gcIntervalTime: secs(10),
      ...config,
    }

    // start gc
    setInterval(this.runGc, this.config.gcIntervalTime)
  }

  /** Run garbage collector */
  private runGc = () => {
    const { maxEntriesCount, maxIddleTime } = this.config
    const size = this.map.size
    const garbageKeys: string[] = []
    const now = Date.now()
    const idxEndRemoval = size - maxEntriesCount
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

  /** Retrieve cache entry */
  get(key: string): T | void {
    const entry = this.map.get(key)
    if (entry) {
      entry.usedAt = Date.now()
      return entry.data
    }
  }

  /** Store cache entry */
  set(key: string, data: T) {
    const now = Date.now()
    return this.map.set(key, {
      data,
      createdAt: now,
      usedAt: now
    })
  }

  /** Delete cache entry */
  delete(key: string) {
    return this.map.delete(key)
  }

  /** Return size of the cache */
  size() {
    return this.map.size
  }
}
