import pSettle from 'p-settle'
import { Engine, createEngine } from './engine'
import { BaseError, ErrorType } from './error'
import { ServiceContext } from './service'
import { createParser, createStringifier } from '../client/json-stream'
import { RequestMessage, ResponseMessage } from '../client/message'

export type RequestContext = ServiceContext<{
  request: any
  response: string
}>

export interface HttpHandlerInterface {
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

const getHttpStatusFromError = (err: BaseError) => {
  switch (err.errorType) {
    case ErrorType.TIMEOUT: return 408
    case ErrorType.EVAL: return 400
    case ErrorType.RUNTIME: return 500
    default: return 500
  }
}

export const handleHttpRequest = async (iface: HttpHandlerInterface) => {
  try {
    const { initialContext = {}, engine = createEngine() } = iface
    const supportsWebStreams = Number(iface.getHeader('Supports-Web-Streams'))
    iface.setStatusCode(207)
    iface.setHeader('Content-Type', 'text/plain;charset=utf-8')
    if (supportsWebStreams) {
      iface.setHeader('Transfer-Encoding', 'chunked')
    }

    let requests

    switch (String(iface.getMethod()).toUpperCase()) {
      case 'GET':
        requests = iface.getQueryParam('requests')
        break
      case 'POST':
        requests = iface.getBody()
        break
      default:
        throw new Error('method not allowed')
    }

    const resultPromises: Promise<any>[] = []

    const strigifier = createStringifier<ResponseMessage>({ onData: iface.write })
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
    iface.setStatusCode(getHttpStatusFromError(err))
    iface.write(err.stack || err)
  } finally {
    iface.end()
  }
}
