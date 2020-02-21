import express from 'express'
import { expressHandler, createEngine } from '../server'
import { query } from './api'

const app = express()
const engine = createEngine({
  api: { query },
})
app.use('/r-func', expressHandler(engine))
app.listen(5000, () => {
  console.log(`🦊 Remote-func server ready`)
})
