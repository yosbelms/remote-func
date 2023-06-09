const partialFuncKeyworkd = '@partial-func'

export const isPartialFunc = (str: string): boolean => {
  return str.indexOf(partialFuncKeyworkd) === 0
}

/** return partial func source */
export const getPartialFuncSource = (partialFuncCommandStr: string): string => {
  return partialFuncCommandStr.substring(partialFuncKeyworkd.length).trim()
}

/** Create partialFunc command */
export const createPartialFunc = (source: string): string => {
  return `${partialFuncKeyworkd} ${source}`
}
