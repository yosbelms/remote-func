import delay from 'delay'
import 'jasmine'
import { bind, Client, createClient, func, RequestHandlerInterface } from '../client'

describe('Client', () => {
  describe('Batch', () => {
    let fetchCallCount: number
    let rFuncCallCount: number
    let rFuncWrap: () => any
    let client: Client

    beforeEach(() => {
      fetchCallCount = 0
      rFuncCallCount = 0
      client = createClient({
        deduplicate: false,
        handler: async () => fetchCallCount++,
      })

      const rFunc = bind(client, func`async () => 1`)
      rFuncWrap = () => {
        rFuncCallCount++
        return rFunc()
      }
    })

    it('should flush when call flush, and keep batching', async () => {
      client.useBatch(true)
      for (let i = 0; i < 30; i++) rFuncWrap()
      client.flush()

      for (let i = 0; i < 30; i++) rFuncWrap()
      client.flush()

      expect(rFuncCallCount).toBe(60)
      expect(fetchCallCount).toBe(2)
    })

    it('should not batch if not specified', async () => {
      for (let i = 0; i < 30; i++) rFuncWrap()

      expect(rFuncCallCount).toBe(30)
      expect(fetchCallCount).toBe(30)
    })

    it('should flush when request count reach limit', async () => {
      client.useBatch({
        sizeLimit: 10
      })

      for (let i = 0; i < 30; i++) rFuncWrap()

      await delay(1000)
      expect(rFuncCallCount).toBe(30)
      expect(fetchCallCount).toBeGreaterThanOrEqual(3)
    })

    it('should flush when reach timeout', async () => {
      client.useBatch({
        timeout: 5
      })

      for (let i = 0; i < 100; i++) {
        rFuncWrap()
        await delay(0)
      }

      expect(rFuncCallCount).toBe(100)
      expect(fetchCallCount).toBeLessThan(27)
      expect(fetchCallCount).toBeGreaterThan(13)
    })

    it('should flush when call batch(false)', async () => {
      client.useBatch(true)
      for (let i = 0; i < 100; i++) rFuncWrap()
      client.useBatch(false)

      expect(rFuncCallCount).toBe(100)
      expect(fetchCallCount).toBe(1)

      client.useBatch(true)
      for (let i = 0; i < 100; i++) {
        rFuncWrap()
      }
      client.useBatch(false)

      expect(rFuncCallCount).toBe(200)
      expect(fetchCallCount).toBe(2)
    })

    it('intercept results', async () => {
      let result
      const client = createClient({
        deduplicate: false,
        async handler(iface: RequestHandlerInterface) {
          iface.getRequests().forEach(req => {
            iface.write({ index: req.index, result: 1 })
          })
          iface.end()
        },
        async response(r) {
          result = r.result
        }
      })

      const rFunc = bind(client, func``)
      await rFunc()

      expect(result as unknown as number).toBe(1)
    })

    it('intercept errors', async () => {
      let error
      const client = createClient({
        deduplicate: false,
        async handler(iface: RequestHandlerInterface) {
          iface.getRequests().forEach(req => {
            iface.write({ index: req.index, error: new Error('x') })
          })
          iface.end()
        },
        async response(r) {
          error = r.error
        }
      })

      const rFunc = bind(client, func``)
      try { await rFunc() } catch (e) { }

      expect(error).toBeInstanceOf(Error)
      expect((error as any).message).toBe('x')
    })

  })
})