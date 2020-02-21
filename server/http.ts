import pSettle from 'p-settle'
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

export interface HttpHandler {
  engine?: Engine
  initialContext?: Partial<RequestContext> & any
  getQueryParam(key: string): any
  getMethod(): string | void
  getBody(): string | void
  getHeader(name: string): string | void
  setHeader(name: string, value: string): void
  setStatusCode(statusCode: number): void
  write(data: any): void
  end(): void
}

export const getHttpStatusFromError = (err: BaseError) => {
  switch (err.errorType) {
    case ErrorType.TIMEOUT: return 408
    case ErrorType.EVAL: return 400
    case ErrorType.RUNTIME: return 500
    default: return 500
  }
}

export const handleHttpRequest = async (httpHandler: HttpHandler) => {
  try {
    const { initialContext = {}, engine = createEngine() } = httpHandler
    const supportsWebStreams = Number(httpHandler.getHeader('Supports-Web-Streams'))
    httpHandler.setStatusCode(207)
    httpHandler.setHeader('Content-Type', 'text/plain;charset=utf-8')
    if (supportsWebStreams) {
      httpHandler.setHeader('Transfer-Encoding', 'chunked')
    }

    let requests

    switch (String(httpHandler.getMethod()).toUpperCase()) {
      case 'GET':
        requests = httpHandler.getQueryParam('requests')
        break
      case 'POST':
        requests = httpHandler.getBody()
        break
      default:
        throw new Error('method not allowed')
    }

    const resultPromises: Promise<any>[] = []

    const strigifier = createStringifier<ResponseMessage>({ onData: httpHandler.write })
    const parser = createParser<RequestMessage>({
      onData(data: RequestMessage) {
        const { index, source, args } = data
        const ctx: RequestContext = { ...initialContext, source, args }
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
    await pSettle(resultPromises)
  } catch (err) {
    httpHandler.setStatusCode(getHttpStatusFromError(err))
    httpHandler.write(err.stack || err)
  } finally {
    httpHandler.end()
  }
}
