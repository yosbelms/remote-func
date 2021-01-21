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

/** Map errors to HTTP status */
const getHttpStatusFromError = (err: BaseError) => {
  switch (err.errorType) {
    case ErrorType.TIMEOUT: return 408
    case ErrorType.EVAL: return 400
    case ErrorType.RUNTIME: return 500
    default: return 500
  }
}

/** Generic HTTP handler, adaptable by providing handler interface */
export const handleHttpRequest = async (iface: HttpHandlerInterface) => {
  try {
    const { initialContext = {}, engine = createEngine() } = iface
    // Supports-Web-Streams is a custom header to let the server know if it can
    // stream back the response
    const supportsWebStreams = Number(iface.getHeader('Supports-Web-Streams'))
    // status code 207 (Multi-Status) because the HTTP response is a batch that can contain
    // successful of failed responses packages
    iface.setStatusCode(207)
    iface.setHeader('Content-Type', 'text/plain;charset=utf-8')
    if (supportsWebStreams === 1) {
      // prepare the response to be streamed
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

    // create JSON stream strigifier and bind to the write function of the interface
    const strigifier = createStringifier<ResponseMessage>({ onData: iface.write })
    // init JSON stream parser
    const parser = createParser<RequestMessage>({
      onData(data: RequestMessage) {
        const { index, source, args } = data
        const ctx: RequestContext = { ...initialContext, source, args }
        const resultPromise = engine.run(source || '', args, ctx).then(result => {
          strigifier.write({ index, result })
        }).catch((err = {}) => {
          const name = err.name
          const message = err.message
          strigifier.write({ index, error: { name, message } })
        })
        resultPromises.push(resultPromise)
      }
    })

    parser.write(requests)
    strigifier.close()
    parser.close()
    // wait for all engine run results
    await pSettle(resultPromises)
  } catch (err) {
    iface.setStatusCode(getHttpStatusFromError(err))
    iface.write(err.stack || err)
  } finally {
    iface.end()
  }
}
