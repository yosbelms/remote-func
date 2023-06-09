import express from 'express'
import { expressHandler, createEngine } from 'remote-func/server'
import * as services from './services'

const engine = createEngine({
  services,
})

const app = express()
app.use(express.static('./'))
app.use('/services', expressHandler(engine))
app.listen(5000, () => {
  console.log(`🦊 Remote-func server ready`)
})
