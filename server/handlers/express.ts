import { handleHttpRequest } from '../http'
import { Engine } from '../engine'

export const expressHandler = (engine: Engine) => {
  const express = require('express')
  const text = express.text()

  return (request: any, response: any, next: Function) => {
    text(request, response, async () => {
      await handleHttpRequest({
        initialContext: { request, response },
        engine: engine,

        getQueryParam(key: string) {
          return request.query[key]
        },
        getMethod() {
          return request.method
        },
        getBody() {
          return request.body
        },
        getHeader(name: string) {
          return request.get(name)
        },
        setHeader(name: string, value: string) {
          return response.set(name, value)
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

      return next()
    })
  }
}
