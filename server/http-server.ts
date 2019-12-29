import { Runner, createRunner } from './runner'
import { BaseError, ErrorType } from './error'
import { compileDtsInMemory } from '../playground/compile'
import * as ts from 'typescript'

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
  query: any,
  body: any,
  ctx: Context,
) => {
  let payload: Payload

  switch (method.toUpperCase()) {
    case 'GET':
      payload = JSON.parse(query.payload)
      break
    case 'POST':
      payload = body
      break
    default:
      throw new Error('method not allowed')
  }

  const result = await runner.run(payload.source || '', payload.args, ctx)

  return JSON.stringify(result)
}

const createMiddleware = (
  runner: Runner = createRunner(),
) => {
  return async (request: any, response: any, next: Function) => {
    try {
      const ctx: Context = { request, response }
      const result = await handleHttpRequest(
        runner,
        request.method,
        request.query,
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
  runner: Runner,
  apiModulePath: string
}) => {
  const { url, app, express, runner, apiModulePath } = config
  app.use(url, [express.json(), createMiddleware(runner)])

  // prepare d.ts
  const compiledApiDts = compileDtsInMemory([apiModulePath], {
    target: ts.ScriptTarget.ES2017,
  })

  const apiDts: any = {}
  Object.keys(compiledApiDts).forEach(key => {
    const src = compiledApiDts[key]
    apiDts[key.replace('.js', '.d.ts')] = src
  })

  const apiModule = runner.getApiModule()
  // console.log(apiDts)
  app.use('/', express.static(__dirname + '/../'))
  app.use('/playground/apiDts.js', (_: any, response: any) => {
    response.send(`
      window.apiModule = {
        'namespace': '${apiModule?.namespace}',
        'path': '${apiModulePath}',
      }
      window.apiDts = ${JSON.stringify(apiDts)}
    `)
  })

  return app
}
