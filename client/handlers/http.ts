import { ReadableStreamDefaultReadValueResult } from 'stream/web'
import { RequestHandlerInterface } from '../client'
import { createParser, createStringifier } from '../json-stream'
import { RequestMessage, ResponseMessage } from '../message'

type Fetch = (
  url: string,
  options: {
    method?: string,
    headers?: { [key: string]: string },
    body?: any
  }
) => Promise<any>

const supportsWebStreams = (
  typeof (globalThis as any).ReadableStream !== 'undefined'
  && typeof (globalThis as any).TextDecoder !== 'undefined'
)

const handleFetchStreamResponse = async (
  response: Response,
  write: (json: string) => void,
  close: () => void,
) => {
  if (response.status === 207) {
    const textDecoder = new TextDecoder()
    const reader = response.body?.getReader()
    const readChunk = (result: ReadableStreamReadResult<Uint8Array>) => {
      if (result.done) {
        close()
      } else {
        write(textDecoder.decode(result.value))
        reader?.read().then(readChunk)
      }
    }
    reader?.read().then(readChunk)
  }
}

const handleFetchNoStreamResponse = (
  response: Response,
  write: (json: string) => void,
  close: () => void,
) => {
  if (response.status === 207) {
    response.text().then((json: string) => {
      write(json)
      close()
    })
  }
}

const handleFetchResponse = (supportsWebStreams
  ? handleFetchStreamResponse
  : handleFetchNoStreamResponse
)

export interface HttpHandlerConfig {
  url: string
  fetch: Fetch
}

/** Create an client HTTP handler that works as a link between Client and HTTP */
export const httpHandler = (_config: Partial<HttpHandlerConfig> = {}) => {
  let url = 'http://localhost/'
  let globalFetch
  if (globalThis && (globalThis as any).location) {
    url = (globalThis as any).location
    globalFetch = (globalThis as any).fetch
  }

  const config = {
    url,
    fetch: globalFetch,
    ..._config,
  } as HttpHandlerConfig

  return (iface: RequestHandlerInterface): void => {
    let payload = ''
    const requests = iface.getRequests()
    const { write, end } = iface
    const { url, fetch } = config
    const headers = {
      'Content-Type': 'text/plain;charset=utf-8',
      'Supports-Web-Streams': supportsWebStreams ? '1' : '0',
    }

    const strigifier = createStringifier<RequestMessage>({
      onData: (str) => payload += str
    })
    requests.forEach(r => strigifier.write(r))

    const parser = createParser<ResponseMessage>({
      onData: write,
      onClose: () => end(),
      onError: (err: any, str: string) => {
        console.log(`${str} ${err.stack}`)
      },
    })

    fetch(url, { method: 'POST', headers: headers, body: payload }).then((response: Response) => {
      handleFetchResponse(response, parser.write, parser.close)
    }).catch((err) => {
      // TODO: handle network error
      end(err)
      console.log(err)
    })
  }
}
