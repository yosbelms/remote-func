import { setupHttpServer, createEngine } from '../server'
import { query } from './api'

setupHttpServer({
  path: '/r-func',
  engine: createEngine({
    api: { query },
  })
}).listen(5000, () => {
  console.log(`🚀 Remote-func server ready`)
})
