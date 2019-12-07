import { createApiClient, serializeApi, callInApi, SERIALIZED_FUNCTION_TOKEN, WITH_CONTEXT_TOKEN, withContext } from '../api'
import 'jasmine'

const api = {
  val: 5,
  func: () => true,
  funcWithParam: (a: any) => a,
  withContext: withContext((ctx) => () => 3)
}

describe('api', () => {

  describe('serializeApi', () => {
    it('should transform functions to function token', () => {
      const serializedIface = serializeApi(api)
      expect(serializedIface.func).toBe(SERIALIZED_FUNCTION_TOKEN)
    })

    it('should transform copy values other that functions', () => {
      const serializedIface = serializeApi(api)
      expect(serializedIface.val).toBe(api.val)
    })
  })

  describe('createApiClient', () => {
    it('should transform function tokens to a custom function', () => {
      const serializedIface = serializeApi(api)
      const createFn = (method: string, basePath: string[]) => () => [basePath, method]
      const apiClient = createApiClient(serializedIface, createFn)
      const result = apiClient.func()
      expect(result).toEqual([[], 'func'])
    })

    it('should clone values other that functions', () => {
      const serializedIface = serializeApi(api)
      const apiClient = createApiClient(serializedIface, () => { })
      expect(apiClient.val).toEqual(api.val)
    })
  })

  describe('withContext', () => {
    it('should add WITH_CONTEXT_TOKEN', () => {
      expect((api.withContext as any)[WITH_CONTEXT_TOKEN]).toBeTruthy()
      expect((api.func as any)[WITH_CONTEXT_TOKEN]).toBeFalsy()
    })
  })

  describe('callInApi', () => {
    it('should call the specified function', () => {
      const result = callInApi(api, [], 'func')
      expect(result).toBe(true)
    })

    it('should throw if doesn\'t find a function to call', () => {
      const tryToCall = () => callInApi(api, [], 'non-exixtent-func')
      expect(tryToCall).toThrow()
    })
  })

})
