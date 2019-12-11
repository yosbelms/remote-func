import pDefer from 'p-defer'
import { noop, secs } from './util'

export interface PoolConfig {
  gc: boolean
  gcIntervalTime: number
  maxResorces: number
  maxIddleTime: number
  maxLifeTime: number
  create: Function
  destroy: Function
  beforeAcquire: Function
  beforeAvailable: Function
}

class ResourceWrapper<T> {
  resource: T
  createdAt: number = 0
  acquiredAt: number = 0
  availableAt: number = 0
  constructor(resource: T) {
    this.resource = resource
    this.createdAt = Date.now()
  }
}

export class Pool<T> {
  private config: PoolConfig
  private available: ResourceWrapper<T>[]
  private acquired: ResourceWrapper<T>[]
  // java days
  private deferredPromisesWaitingForAvailableResource: pDefer.DeferredPromise<T>[]
  private isDestroyed: boolean
  private isLending: boolean

  private gcIntervalId?: NodeJS.Timeout

  constructor(config: Partial<PoolConfig> = {}) {
    const defaults = {
      gc: true,
      gcIntervalTime: secs(10),
      maxResorces: 5,
      maxIddleTime: secs(10),
      maxLifeTime: secs(30),
      create: noop,
      destroy: noop,
      beforeAcquire: noop,
      beforeAvailable: noop,
    }
    this.config = { ...defaults, ...config } as PoolConfig
    this.available = []
    this.acquired = []
    // java days
    this.deferredPromisesWaitingForAvailableResource = []
    this.isDestroyed = false
    this.isLending = false

    if (this.config.gc) {
      this.gcIntervalId = setInterval(this.runGc, this.config.gcIntervalTime)
    }
  }

  private runGc = () => {
    if (this.available.length === 0) return

    const now = Date.now()

    // collect iddles and stales when available
    const garbage: T[] = []
    this.available.forEach(rw => {
      const availableAt = rw.availableAt as number

      // iddle
      if ((now - availableAt >= this.config.maxIddleTime)) {
        garbage.push(rw.resource)
      }

      // stale
      if (this.isStale(rw)) {
        garbage.push(rw.resource)
      }
    })

    // remove garbage
    garbage.forEach(r => this.remove(r))
  }

  private isStale(rw: ResourceWrapper<T>) {
    return Date.now() - rw.createdAt >= this.config.maxLifeTime
  }

  private findWrapperIdxByResource(list: ResourceWrapper<T>[], resource: T) {
    return list.findIndex(rw => rw.resource === resource)
  }

  isAvailable(resource: T) {
    return !!~this.findWrapperIdxByResource(this.available, resource)
  }

  isAcquired(resource: T) {
    return !!~this.findWrapperIdxByResource(this.acquired, resource)
  }

  contains(resource: T) {
    return this.isAvailable(resource) || this.isAcquired(resource)
  }

  length() {
    return this.available.length + this.acquired.length
  }

  isFull() {
    return this.length() >= this.config.maxResorces
  }

  hasAvailableResources() {
    return this.available.length > 0
  }

  private async lendResources() {
    // mutex on
    if (this.isLending) return
    this.isLending = true

    const { create, beforeAcquire, beforeAvailable } = this.config
    while (this.deferredPromisesWaitingForAvailableResource.length) {
      if (this.isDestroyed) return

      // just collaborate
      await Promise.resolve()

      // create a new resource
      if (!this.isFull() && !this.hasAvailableResources()) {
        const resource = await Promise.resolve(create())
        const resourceWrapper = new ResourceWrapper(resource)
        const canBeAvailable = await beforeAvailable(resource)
        if (canBeAvailable !== false) {
          resourceWrapper.availableAt = Date.now()
          this.available.push(resourceWrapper)
        }
      }

      // lend available resource
      if (this.hasAvailableResources() && this.deferredPromisesWaitingForAvailableResource.length) {
        const resourceWrapper = this.available[0]
        // discard stale resources
        if (this.isStale(resourceWrapper)) {
          this.remove(resourceWrapper.resource)
          continue
        }
        const canBeAcquired = await beforeAcquire(resourceWrapper.resource)
        if (canBeAcquired !== false) {
          this.available.shift()
          resourceWrapper.acquiredAt = Date.now()
          this.acquired.push(resourceWrapper)
          const deferredPromise = this.deferredPromisesWaitingForAvailableResource.shift()
          if (deferredPromise) deferredPromise.resolve(resourceWrapper.resource)
        }

      } else {
        break
      }
    }

    // mutex off
    this.isLending = false
  }

  async acquire() {
    if (this.isDestroyed) return
    const deferredPromise: pDefer.DeferredPromise<T> = pDefer()
    this.deferredPromisesWaitingForAvailableResource.push(deferredPromise)
    await this.lendResources()
    return deferredPromise.promise
  }

  async release(resource: T) {
    if (this.isDestroyed) return
    const { beforeAvailable } = this.config
    if (this.isAcquired(resource)) {
      const canBeAvailable = await beforeAvailable(resource)
      if (canBeAvailable !== false) {
        const idx = this.findWrapperIdxByResource(this.acquired, resource)
        const resourceWrapper = this.acquired[idx]
        this.acquired.splice(idx, 1)
        resourceWrapper.availableAt = Date.now()
        this.available.push(resourceWrapper)
      }
    }
    this.lendResources()
  }

  async remove(resource: T) {
    const { destroy } = this.config
    if (this.isAvailable(resource)) {
      const idx = this.findWrapperIdxByResource(this.available, resource)
      this.available.splice(idx, 1)
    } else if (this.isAcquired(resource)) {
      const idx = this.findWrapperIdxByResource(this.acquired, resource)
      this.acquired.splice(idx, 1)
    }
    await destroy(resource)
    this.lendResources()
  }

  async destroy() {
    this.isDestroyed = true
    clearInterval(this.gcIntervalId as NodeJS.Timeout)
    const resources = [...this.available, ...this.acquired]
    this.available.splice(0, this.available.length)
    this.acquired.splice(0, this.acquired.length)
    this.deferredPromisesWaitingForAvailableResource.forEach(p => p.resolve())
    const promises = resources.map(rw => this.remove(rw.resource))
    return Promise.all(promises)
  }

}
