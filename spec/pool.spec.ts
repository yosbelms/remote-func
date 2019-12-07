import 'jasmine'
import { Pool } from '../pool'
import delay from 'delay'

describe('pool', () => {
  it('isAcquired', async () => {
    const resource = {}
    const pool = new Pool({ create: () => resource })
    const r = await pool.acquire()
    expect(r).toBe(resource)
    expect(pool.isAcquired(r)).toBe(true)
    expect(pool.contains(r)).toBe(true)
  })

  it('isAvailable', async () => {
    const resource = {}
    const pool = new Pool({ create: () => resource })
    const r = await pool.acquire()
    await pool.release(r)
    expect(r).toBe(resource)
    expect(pool.isAvailable(r)).toBe(true)
    expect(pool.contains(r)).toBe(true)
  })

  it('length', async () => {
    const pool = new Pool({ create: () => null })
    await pool.acquire()
    expect(pool.length()).toBe(1)
    await pool.acquire()
    expect(pool.length()).toBe(2)
  })

  it('isFull', async () => {
    const maxResorces = 3
    const pool = new Pool({ maxResorces, create: () => null })
    await pool.acquire()
    await pool.acquire()
    expect(pool.isFull()).toBe(false)
    await pool.acquire()
    expect(pool.isFull()).toBe(true)
  })

  it('hasAvailableResources', async () => {
    const maxResorces = 3
    const pool = new Pool({ maxResorces, create: () => null })
    expect(pool.hasAvailableResources()).toBe(false)
    const r = await pool.acquire()
    await pool.release(r)
    expect(pool.hasAvailableResources()).toBe(true)
  })

  it('remove', async () => {
    let destroyed = false
    const destroy = () => destroyed = true
    const pool = new Pool({ create: () => null, destroy })
    const r = await pool.acquire()
    await pool.remove(r)
    expect(destroyed).toBe(true)
    expect(pool.length()).toBe(0)
  })

  it('gc remove iddle', async () => {
    const pool = new Pool({ create: () => null, maxIddleTime: 1, gc: true, gcIntervalTime: 1 })
    const r = await pool.acquire()
    await pool.release(r)
    await delay(10)
    expect(pool.length()).toBe(0)
  })


  it('gc remove stale', async () => {
    const pool = new Pool({ create: () => null, maxIddleTime: 20000, gc: true, gcIntervalTime: 1, maxLifeTime: 1 })
    const r = await pool.acquire()
    await pool.release(r)
    await delay(10)
    expect(pool.length()).toBe(0)
  })

})
