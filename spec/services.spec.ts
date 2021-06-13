import 'jasmine'
import { createService, instantiateServices } from '../server/service'
import * as fixtureApiModule from './fixtures/servicesModule'

type Context = {
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

    it('the this context of endpoint should be the ', () => {
      const exampleService = createService(() => ({
        endpoint1: () => 1,
        endpoint2() {
          return this.endpoint1() + 1
        }
      }))
      const serviceInstance = instantiateServices({ exampleService })
      expect(serviceInstance.exampleService.endpoint2()).toEqual(2)
    })

    it('should log service and endpoints if there is a "log" function in context', () => {
      const logs: any[] = []
      const log = (msg: any) => logs.push(msg)

      const ctx = { ...ctxExample, log }
      const serviceInstance = instantiateServices({ exampleService }, ctx)
      serviceInstance.exampleService.endpoint(0)

      expect(logs).toEqual([
        {
          type: 'call-endpoint',
          service: 'exampleService',
          endpoint: 'endpoint',
          args: [0]
        }
      ])
    })
  })

})
