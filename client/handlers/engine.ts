import { RequestHandlerInterface } from '../client'

interface Engine {
  run(source: string, args: any[], ctx: any): Promise<any>
}

export const engineHandler = (engine: Engine) => {
  return (iface: RequestHandlerInterface): void => {
    const { getRequests, write, end } = iface

    try {
      const responsePromises = getRequests().map((request) => {
        const { source, args, index } = request
        const ctx = { source, args }
        return engine.run(source || '', args, ctx).then(result => {
          write({ index, result })
        }).catch((err = {}) => {
          const { stack } = err
          write({ index, error: stack || err })
        })
      })

      Promise.all(responsePromises).then(() => end(), () => end())
    } catch (err) {
      end(err)
      console.log(err)
    }
  }
}
