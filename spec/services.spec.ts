import 'jasmine'
import { createService, instantiateServices, ServiceContext } from '../server/service'
import * as fixtureApiModule from './fixtures/servicesModule'

interface Context extends ServiceContext {
  user: { username: string }
}

const ctxExample = { prop: 1 }
const exampleService = createService((ctx: Context) => ({
  endpoint: (a: any) => a,
  endpointReturnCtx: () => ctx,
  endpointCtxTypeAssert: () => ctx.user.username,
}))

describe('services', () => {
  it('should recognize services module', () => {
    const srvs = instantiateServices(fixtureApiModule)
    expect(srvs.posts.getPost()).toBe('post')
  })

  it('can not be mutated', () => {
    const service = instantiateServices({ exampleService })
    service.exampleService.endpoint = () => { }
    expect(service.exampleService.endpoint(1)).toBe(1)
  })

  describe('instanceService', () => {
    it('should make functions available', () => {
      const serviceInstance = instantiateServices({ exampleService }, ctxExample)
      expect(serviceInstance.exampleService.endpoint(0)).toBe(0)
    })

    it('endpoint can read context', () => {
      const serviceInstance = instantiateServices({ exampleService }, ctxExample)
      expect(serviceInstance.exampleService.endpointReturnCtx()).toEqual(ctxExample as any)
    })

    it('returned values should be cloned', () => {
      const val = { a: 1, b: 2 }
      const serviceInstance = instantiateServices({ exampleService }, ctxExample)
      expect(serviceInstance.exampleService.endpoint(val)).toEqual(val)
      expect(serviceInstance.exampleService.endpoint(val)).not.toBe(val)
    })
  })

})
