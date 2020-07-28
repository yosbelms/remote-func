import 'jasmine'
import { createCfunc } from '../cfunc'
import { TimeoutError, MemoryLimitError } from '../server/error'

describe('Cfunc', () => {

  describe('should throw', () => {

    it('if it is not an async function', async () => {
      const create = () => createCfunc({
        source: `const x = 1`
      })
      expect(create).toThrow()
    })

    it('on timeout', async () => {
      const cfunc = createCfunc({
        timeout: 10,
        source: `async() => {
          while(true){}
        }`
      })
      expectAsync(cfunc()).toBeRejectedWith(TimeoutError)
    })

    it('on memory limit exceed', async () => {
      const cfunc = createCfunc({
        memoryLimit: 100,
        source: `async() => {
          const arr = []
          while(true) arr.push(0)
        }`
      })

      try {
        await cfunc()
      } catch (e) {
        expect(e.constructor).toBe(MemoryLimitError)
      }
    })

    it('on access to undeclared global', async () => {
      const create = () => createCfunc({
        globalNames: [],
        source: `async() => UndeclaredGlobal`
      })

      expect(create).toThrow()
    })

    it('on reassign global', async () => {
      const cfunc = createCfunc({
        globalNames: ['Object'],
        source: `async() => Object = null`
      })

      expectAsync(cfunc(void 0, { Object })).toBeRejected()
    })

  })

  // bug
  it('should not properly call a function (non member expression) when its arguments are member expressions', async () => {
    const len = 1
    const cfunc = createCfunc({
      globalNames: ['Array'],
      source: `async(len) => {
        const obj = { len: len }
        return Array(obj.len)
      }`
    })

    const result = await cfunc([len], { Array })
    expect(result.length).toEqual(len)
  })

})
