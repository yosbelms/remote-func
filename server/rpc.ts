
const rpcKeyworkd = '@rpc'
const rpcTargetSeparator = '.'

export const isRpcCommand = (source: string): boolean => {
  return source.indexOf(rpcKeyworkd) === 0
}

/** Parse rpc command */
export const parseRpcCommand = (rpcCommandStr: string): { service: string, method: string } => {
  const target = rpcCommandStr.substring(rpcKeyworkd.length).trim()
  const splitted = target.split(rpcTargetSeparator)
  return {
    service: splitted[0],
    method: splitted[1],
  }
}

/** Create rpc command */
export const createRpcCommand = (service: string, method: string): string => {
  return `${rpcKeyworkd} ${service}${rpcTargetSeparator}${method}`
}
