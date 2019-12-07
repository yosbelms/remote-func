import 'jasmine'
import { createWorker, WorkerConfig } from '../worker'
import { MessageChannel } from 'worker_threads'
import { MessageType } from '../message'

const createWorkerPort = (config: Partial<WorkerConfig> = {}) => {
  const { port1, port2 } = new MessageChannel()
  createWorker({ parentPort: port1, ...config })
  return port2
}

describe('worker', () => {
  it('should run javascript function', (done) => {
    const result = 1
    const port = createWorkerPort()

    port.on('message', (msg) => {
      expect(msg).toEqual({ type: MessageType.RETURN, result })
      done()
    })

    port.postMessage({
      type: MessageType.EXECUTE,
      source: `() => ${result}`
    })
  })
})
