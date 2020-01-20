import { endpoint, isEndpoint, readApiModule, isApiModule, contextifyApi } from '../server/api'
import * as fixtureApiModule from './fixtures/apiModule'
import 'jasmine'

const ctxExample = { prop: 1 }
const apiExample = {
  func: (a: any) => a,
  endpoint: endpoint(() => (a: any) => a),
  endpointReturnCtx: endpoint((ctx) => () => ctx),
}

describe('api', () => {
  it('should recognize api module', () => {
    const apiModule = readApiModule(fixtureApiModule)
    expect(apiModule.namespace).toBe('MyApi')
  })

  it('should recognize api module', () => {
    expect(isApiModule(fixtureApiModule)).toBe(true)
  })

  it('should read api module', () => {
    const apiModule = readApiModule(fixtureApiModule)
    expect(apiModule.namespace).toBe('MyApi')
  })

  describe('endopoint', () => {
    it('should create endpoint', () => {
      const ep = endpoint(() => () => { })
      expect(isEndpoint(ep)).toBe(true)
    })
  })

  describe('contextifyApi', () => {
    it('should make functions available', () => {
      const contextifiedApi = contextifyApi(apiExample, ctxExample)
      expect(contextifiedApi.func(0)).toBe(0)
      expect(contextifiedApi.endpoint(0)).toBe(0)
    })

    it('endpoint can read context', () => {
      const contextifiedApi = contextifyApi(apiExample, ctxExample)
      expect(contextifiedApi.endpointReturnCtx()).toEqual(ctxExample)
    })

    it('returned values should be cloned', () => {
      const val = { a: 1, b: 2 }
      const contextifiedApi = contextifyApi(apiExample, ctxExample)
      expect(contextifiedApi.func(val)).toEqual(val)
      expect(contextifiedApi.func(val)).not.toBe(val)
    })
  })

})
