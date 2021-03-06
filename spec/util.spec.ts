import 'jasmine'
import { deepClone, readOnly } from '../server/util'

describe('util', () => {
  describe('deepClone', () => {
    it('should handle primitives', () => {
      expect(deepClone(1)).toEqual(1)
      expect(deepClone('a')).toEqual('a')
      expect(deepClone(true)).toEqual(true)
    })

    it('should handle date', () => {
      const source = new Date()
      expect(deepClone(source).getTime()).toEqual(source.getTime())
    })

    it('should handle objects', () => {
      const source = { a: 1 }
      expect(deepClone(source)).toEqual(source)
    })

    it('should handle arrays', () => {
      const source = [1, 2]
      expect(deepClone(source)).toEqual(source)
    })

    it('should call toJSON if exists', () => {
      const toJSON = () => ({ a: 1, b: 2 })
      const source = { toJSON }
      expect(deepClone(source)).toEqual(toJSON())
    })

    it('should handle promises', (done) => {
      const source = { a: 1, b: 2 }
      deepClone(Promise.resolve(source)).then((r) => {
        expect(r).toEqual(source)
        done()
      })
    })

    it('should stop on max depth', () => {
      const depth = 10
      const source = { depth: 1, source: {} } as any
      source.source = source

      let cloned = deepClone(source, depth)
      let count = 0
      while (cloned) {
        count += cloned.depth
        cloned = cloned.source
      }

      expect(count).toBe(depth)
    })
  })

  describe('readOnly', () => {
    it('should seal objects', () => {
      const obj = readOnly({ prop: 1 })
      obj.prop = 2
      expect(obj.prop).toEqual(1)
    })

    it('should allow promises to work with async/await', async () => {
      const one = await readOnly(Promise.resolve(1))
      expect(one).toEqual(1)
    })

  })

})
