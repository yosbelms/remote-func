import { Runner, createRunner } from './runner'
import { BaseError, ErrorType } from './error'

export interface Context {
  request: any
  response: any
}

export interface Payload {
  source?: string
  args?: any[]
}

const getHttpStatusFromError = (err: BaseError) => {
  switch (err.errorType) {
    case ErrorType.TIMEOUT: return 408
    case ErrorType.EVAL: return 400
    case ErrorType.RUNTIME: return 500
    case ErrorType.EXIT: return 503
    default: return 500
  }
}

const handleHttpRequest = async (
  runner: Runner,
  method: string,
  body: any,
  ctx: Context,
) => {
  if (method.toUpperCase() !== 'POST') throw new Error('method not allowed')

  const payload: Payload = typeof body === 'string' ? JSON.parse(body) : body
  const result = await (runner as Runner).run(
    payload.source || '',
    payload.args,
    ctx,
  )

  return JSON.stringify(result)
}

const createMiddleware = (
  runner: Runner = createRunner()
) => {
  return async (request: any, response: any, next: Function) => {
    try {
      const ctx: Context = { request, response }
      const result = await handleHttpRequest(
        runner,
        request.method,
        request.body,
        ctx,
      )
      response.send(result)
      next()
    } catch (err) {
      response.statusCode = getHttpStatusFromError(err)
      response.send(err.stack)
      next()
    }
  }
}

export const setupServer = (config: {
  url?: string,
  app: any,
  express: any,
  runner: Runner
}) => {
  const { url, app, express, runner } = config
  app.use(url, [express.json(), createMiddleware(runner)])
  return app
}
