
export const createGlobalsPlugin = (allowedGlobals: string[] = []) => {
  const isAllowedGlobal = (name: string) => allowedGlobals.indexOf(name) !== -1

  return () => {
    return {
      visitor: {
        Identifier: (path: any, state: any) => {
          const isGlobal = state.globalsNodes.indexOf(path.node) !== -1
          const name = path.node.name
          if (isGlobal && !isAllowedGlobal(name)) {
            throw path.buildCodeFrameError(`Unknown ${name}`)
          }
        },
        Program: (path: any, state: any) => {
          state.globalsNodes = Object.values(path.scope.globals || {})
        },
      },
    }
  }
}
