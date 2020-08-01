import { IncomingMessage, ServerResponse } from 'http'
import { handleHttpRequest } from '../http'
import { Engine } from '../engine'

/** Create an Express handler that works as a link between HTTP and Engine*/
export const nextHandler = (engine: Engine) => {
  return async (request: IncomingMessage, response: ServerResponse) => {
    await handleHttpRequest({
      initialContext: { request, response },
      engine: engine,

      getQueryParam(key: string) {
        return (request as any).query[key]
      },
      getMethod() {
        return request.method
      },
      getBody() {
        return (request as any).body
      },
      getHeader(name: string) {
        return String(request.headers[name])
      },
      setHeader(name: string, value: string) {
        return response.setHeader(name, value)
      },
      setStatusCode(statusCode: number) {
        response.statusCode = statusCode
      },
      write(data: any) {
        if (response.finished || response.writableEnded) {
          throw new Error('Response ended')
        }
        response.write(data)
      },
      end() {
        response.end()
      }
    })
  }
}
