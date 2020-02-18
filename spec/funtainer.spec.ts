import 'jasmine'
import { createFuntainer } from '../funtainer'
import { TimeoutError, MemoryLimitError } from '../server/error'

describe('Funtainer', () => {

  describe('should throw', () => {

    it('if it is not an async function', async () => {
      const create = () => createFuntainer({
        source: `const x = 1`
      })
      expect(create).toThrow()
    })

    it('on timeout', async () => {
      const funtainer = createFuntainer({
        timeout: 10,
        source: `async() => {
          while(true){}
        }`
      })
      expectAsync(funtainer()).toBeRejectedWith(TimeoutError)
    })

    it('on memory limit exceed', async () => {
      const funtainer = createFuntainer({
        memoryLimit: 100,
        source: `async() => {
          const arr = []
          while(true) arr.push(0)
        }`
      })

      try {
        await funtainer()
      } catch (e) {
        expect(e.constructor).toBe(MemoryLimitError)
      }
    })

    it('on access to undeclared global', async () => {
      const create = () => createFuntainer({
        globalNames: [],
        source: `async() => Object.keys([])`
      })

      expect(create).toThrow()
    })

    it('on reassign global', async () => {
      const funtainer = createFuntainer({
        globalNames: ['Object'],
        source: `async() => Object = null`
      })

      expectAsync(funtainer(void 0, { Object })).toBeRejected()
    })

  })

})
