import pSettle from 'p-settle'
import { Runner, createRunner } from './runner'
import { BaseError, ErrorType } from './error'
import { createParser, createStringifier } from '../client/json-stream'
import { RequestMessage, ResponseMessage } from '../client/message'
import { isString } from './util'

export interface RequestContext {
  headers: any
  method: string
  query: any
  source: string
  args: any[]
}

const getHttpStatusFromError = (err: BaseError) => {
  switch (err.errorType) {
    case ErrorType.TIMEOUT: return 408
    case ErrorType.EVAL: return 400
    case ErrorType.RUNTIME: return 500
    default: return 500
  }
}

const handleHttpRequest = (
  runner: Runner,
  headers: any,
  method: string,
  query: any,
  body: any,
  write: (data: any) => void,
) => {
  let requests: string

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

  const resultPromises: Promise<any>[] = []

  const strigifier = createStringifier<ResponseMessage>({ onData: write })
  const parser = createParser<RequestMessage>({
    onData(data: RequestMessage) {
      const { index, source, args } = data
      const ctx: RequestContext = { headers, method, query, source, args }
      const resultPromise = runner.run(source || '', args, ctx).then(result => {
        strigifier.write({ index, result })
      }).catch(error => {
        strigifier.write({ index, error })
      })
      resultPromises.push(resultPromise)
    },
    onClose(buffer: string) {
      if (isString(buffer) && buffer.length > 0) {
        throw new Error('Closing JSON stream with data in buffer')
      }
    }
  })

  parser.write(requests)
  parser.close()
  return pSettle(resultPromises)
}

const createMiddleware = (
  runner: Runner = createRunner(),
) => {
  return async (request: any, response: any, next: Function) => {
    try {
      const supportsWebStreams = Number(request.get('Supports-Web-Streams'))
      response.statusCode = 207
      response.set('Content-Type', 'text/plain;charset=utf-8')
      if (supportsWebStreams) {
        response.set('Transfer-Encoding', 'chunked')
      }

      await handleHttpRequest(
        runner,
        request.headers,
        request.method,
        request.query,
        request.body,
        response.write.bind(response),
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

export const setupExpressServer = (config: {
  path?: string,
  app?: any,
  runner: Runner,
}) => {
  let { path, app, runner } = config
  let express
  let bodyParser
  try {
    express = require('express')
    bodyParser = require('body-parser')
  } catch (_) {
    throw new Error('Please add Express.js as dependency')
  }

  if (!app) {
    app = express()
  }

  app.use(path || '/', [bodyParser.text(), createMiddleware(runner)])
  return app
}
