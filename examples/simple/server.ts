import express from 'express'
import { expressHandler, createEngine, createService } from '../../server'

const services = {
  todo: createService(() => ({
    async getAll() {
      return [
        { title: 'Buy milk' },
        { title: 'Buy dog food' },
        { title: 'Learn JS' }
      ]
    }
  }))
}

const engine = createEngine({
  services,
})

const app = express()
app.use(express.static('./'))
app.use('/services', expressHandler(engine))
app.listen(5000, () => {
  console.log(`🦊 Remote-func server ready`, 'http://localhost:5000')
})
