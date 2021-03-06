import { RequestHandlerInterface } from '../client'

interface Engine {
  run(source: string, args: any[], ctx: any): Promise<any>
}

/** Create an Client handler that works as a direct link between Client and Engine*/
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
          const { name, message } = err
          write({ index, error: { name, message }})
        })
      })

      Promise.all(responsePromises).then(() => end(), () => end())
    } catch (err) {
      end(err)
      console.log(err)
    }
  }
}
