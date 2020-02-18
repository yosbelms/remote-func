import pSettle from 'p-settle'
import express from 'express'
import { Engine, createEngine } from './engine'
import { BaseError, ErrorType } from './error'
import { createParser, createStringifier } from '../client/json-stream'
import { RequestMessage, ResponseMessage } from '../client/message'

export interface RequestContext {
  request: any
  response: string
  source: string
  args: any[]
}

export const getHttpStatusFromError = (err: BaseError) => {
  switch (err.errorType) {
    case ErrorType.TIMEOUT: return 408
    case ErrorType.EVAL: return 400
    case ErrorType.RUNTIME: return 500
    default: return 500
  }
}

export const handleHttpRequest = (
  engine: Engine,
  requests: string,
  write: (data: any) => void,
  context: any,
) => {
  const resultPromises: Promise<any>[] = []

  const strigifier = createStringifier<ResponseMessage>({ onData: write })
  const parser = createParser<RequestMessage>({
    onData(data: RequestMessage) {
      const { index, source, args } = data
      const ctx: RequestContext = { ...context, source, args }
      const resultPromise = engine.run(source || '', args, ctx).then(result => {
        strigifier.write({ index, result })
      }).catch((err = {}) => {
        const { stack } = err
        strigifier.write({ index, error: stack || err })
      })
      resultPromises.push(resultPromise)
    }
  })

  parser.write(requests)
  strigifier.close()
  parser.close()
  return pSettle(resultPromises)
}

const createMiddleware = (
  engine: Engine = createEngine(),
) => {
  return async (request: any, response: any, next: Function) => {
    try {
      const supportsWebStreams = Number(request.get('Supports-Web-Streams'))
      response.statusCode = 207
      response.set('Content-Type', 'text/plain;charset=utf-8')
      if (supportsWebStreams) {
        response.set('Transfer-Encoding', 'chunked')
      }

      const write = (data: any) => {
        if (response.finished || response.writableEnded) {
          throw new Error('Response ended')
        }
        response.write(data)
      }

      const method = request.method
      const query = request.query
      const body = request.body

      let requests

      switch (method.toUpperCase()) {
        case 'GET':
          requests = query.requests
          break
        case 'POST':
          requests = body
          break
        default:
          throw new Error('method not allowed')
      }

      const context = {
        request,
        response,
      }

      await handleHttpRequest(
        engine,
        requests,
        write,
        context,
      )
      response.end()
      next()
    } catch (err) {
      response.statusCode = getHttpStatusFromError(err)
      response.send(err.stack || err)
      next()
    }
  }
}

export const setupHttpServer = (config: {
  path?: string,
  app?: any,
  engine: Engine,
}) => {
  let { path, app, engine } = config

  if (!app) {
    app = express()
  }

  app.use(path || '/', [express.text(), createMiddleware(engine)])
  return app
}
