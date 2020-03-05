import 'jasmine'
import { createService, readApi, instantiateApi, instantiateService, isService, createApi, UnfoldedApi, FoldApiType } from '../server/api'
import * as fixtureApiModule from './fixtures/apiModule'

const ctxExample = { prop: 1 }
const exampleService = createService((ctx) => ({
  endpoint: (a: any) => a,
  endpointReturnCtx: () => ctx,
}))

describe('api', () => {
  it('should recognize api module', () => {
    const api = createApi(fixtureApiModule)
    const apiModule = readApi(api as unknown as FoldApiType<typeof api>)
    expect(apiModule).toEqual(fixtureApiModule)
  })

  it('can not be mutated', () => {
    const service = instantiateApi(createApi({ exampleService }))
    service.exampleService.endpoint = () => { }
    expect(service.exampleService.endpoint(1)).toBe(1)
  })

  describe('endopoint', () => {
    it('should create service', () => {
      const s = createService(() => ({}))
      expect(isService(s)).toBe(true)
    })
  })

  describe('instanceService', () => {
    it('should make functions available', () => {
      const serviceInstance = instantiateService(exampleService, ctxExample)
      expect(serviceInstance.endpoint(0)).toBe(0)
    })

    it('endpoint can read context', () => {
      const serviceInstance = instantiateService(exampleService, ctxExample)
      expect(serviceInstance.endpointReturnCtx()).toEqual(ctxExample)
    })

    it('returned values should be cloned', () => {
      const val = { a: 1, b: 2 }
      const serviceInstance = instantiateService(exampleService, ctxExample)
      expect(serviceInstance.endpoint(val)).toEqual(val)
      expect(serviceInstance.endpoint(val)).not.toBe(val)
    })
  })

})
