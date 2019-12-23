import { mins, secs } from './util'

export interface FunctionCacheEntry {
  fn: Function
  gcable: boolean
  createdAt: number
  usedAt: number
}

export class FunctionCache {
  private map: Map<string, FunctionCacheEntry>
  private maxFunctionsCount: number
  private maxIddleTime: number
  private gcIntervalTime: number

  constructor() {
    this.map = new Map()
    this.maxFunctionsCount = 10000
    this.maxIddleTime = mins(10)
    this.gcIntervalTime = secs(10)

    // start gc
    setInterval(this.runGc, this.gcIntervalTime)
  }

  private runGc = () => {
    const size = this.map.size
    const garbageKeys = []
    const now = Date.now()
    const idxToStartRemoval = size - this.maxFunctionsCount
    let count = 0

    for (let [key, entry] of Object.entries(this.map)) {
      if (!entry.gcable) continue
      if (count >= idxToStartRemoval) {
        // extra
        garbageKeys.push(key)
      } else if (now - entry.usedAt >= this.maxIddleTime) {
        // iddle
        garbageKeys.push(key)
      }
      count++
    }

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

  set(key: string, fn: Function, gcable?: boolean = true) {
    const now = Date.now()
    return this.map.set(key, {
      fn,
      gcable,
      createdAt: now,
      usedAt: now
    })
  }

  delete(key: string) {
    return this.map.delete(key)
  }
}
