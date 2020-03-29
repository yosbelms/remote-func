import 'jasmine'
import { createSefunc } from '../sefunc'
import { TimeoutError, MemoryLimitError } from '../server/error'

describe('Sefunc', () => {

  describe('should throw', () => {

    it('if it is not an async function', async () => {
      const create = () => createSefunc({
        source: `const x = 1`
      })
      expect(create).toThrow()
    })

    it('on timeout', async () => {
      const sefunc = createSefunc({
        timeout: 10,
        source: `async() => {
          while(true){}
        }`
      })
      expectAsync(sefunc()).toBeRejectedWith(TimeoutError)
    })

    it('on memory limit exceed', async () => {
      const sefunc = createSefunc({
        memoryLimit: 100,
        source: `async() => {
          const arr = []
          while(true) arr.push(0)
        }`
      })

      try {
        await sefunc()
      } catch (e) {
        expect(e.constructor).toBe(MemoryLimitError)
      }
    })

    it('on access to undeclared global', async () => {
      const create = () => createSefunc({
        globalNames: [],
        source: `async() => UndeclaredGlobal`
      })

      expect(create).toThrow()
    })

    it('on reassign global', async () => {
      const sefunc = createSefunc({
        globalNames: ['Object'],
        source: `async() => Object = null`
      })

      expectAsync(sefunc(void 0, { Object })).toBeRejected()
    })

  })

  // bug
  it('should not properly call a function (non member expression) when its arguments are member expressions', async () => {
    const len = 1
    const sefunc = createSefunc({
      globalNames: ['Array'],
      source: `async(len) => {
        const obj = { len: len }
        return Array(obj.len)
      }`
    })

    const result = await sefunc([len], { Array })
    expect(result.length).toEqual(len)
  })

})
