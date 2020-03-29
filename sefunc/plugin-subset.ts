
export const createSubsetPlugin = (allowedNodeTypes: string[] = []) => {
  return ({ types: t }: { types: any }) => {
    // slice because babel throws an strange error here related to symbols
    const babelTypes = t.TYPES.slice(0, t.TYPES.length - 10)
    const deprecatedTypes = t.DEPRECATED_KEYS
    const visitor = babelTypes.reduce((visitor: any, _type: string) => {
      if (
        typeof _type === 'string'
        && !deprecatedTypes[_type]
        && allowedNodeTypes.indexOf(_type) === -1
      ) {
        visitor[_type] = (path: any) => {
          throw path.buildCodeFrameError(`${_type} not allowed`)
        }
      }
      return visitor
    }, {})

    return {
      visitor,
    }
  }
}
