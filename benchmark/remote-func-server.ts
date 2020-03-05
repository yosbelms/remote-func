import express from 'express'
import { expressHandler, createEngine, createApi } from '../server'
import api from './api'

const app = express()
const engine = createEngine({
  api,
})
app.use('/r-func', expressHandler(engine))
app.listen(5000, () => {
  console.log(`🦊 Remote-func server ready`)
})
