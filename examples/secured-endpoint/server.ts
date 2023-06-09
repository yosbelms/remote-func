import express from 'express'
import { expressHandler, createEngine, createService, RequestContext } from '../../server'
const cookieParser = require('cookie-parser')

type AppContext = {
  authorized: boolean
}

const todos = [
  { title: 'Buy milk' },
  { title: 'Buy dog food' },
  { title: 'Learn JS' }
]

const services = {
  todo: createService((ctx: AppContext) => ({
    async getAll() {
      if (!ctx.authorized) throw new Error('not authorized')
      return todos
    }
  }))
}

const engine = createEngine({
  services,
  context: async (reqCtx: RequestContext) => {
    const ctx: AppContext = {
      authorized: false
    }
    const authorizedCookieVal = reqCtx.request.cookies['authorized']
    if (authorizedCookieVal === '1') {
      ctx.authorized = true
    }
    return ctx
  },
})

const app = express()
app.use(cookieParser())
app.use(express.static('./'))
app.use('/services', expressHandler(engine))
app.listen(5000, () => {
  console.log(`🦊 Remote-func server ready`, 'http://localhost:5000')
})
