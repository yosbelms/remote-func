import { IncomingMessage, ServerResponse } from 'http'
import { handleHttpRequest } from '../http'
import { Engine } from '../engine'

export const microHandler = (engine: Engine) => {
  const { text } = require('micro')

  return async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const body = await text(request)

    await handleHttpRequest({
      initialContext: { request, response },
      engine: engine,

      getQueryParam(key: string) {
        return url.searchParams.get(key)
      },
      getMethod() {
        return request.method
      },
      getBody() {
        return body
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
