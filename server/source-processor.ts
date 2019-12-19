import * as babel from 'babel-core'

export const transform = (src: string, timeout: number = 1000) => {
  const sourceProcessorPlugin = screateSourceProcessorPlugin(timeout)
  const out = babel.transform(src, {
    plugins: [sourceProcessorPlugin]
  })
  return out.code
}

const getParentFunctionNode = (t: any, path: any) => {
  let parent = path
  let node = path.node
  while (node) {
    node = parent.node
    if (node && (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node))) {
      return node
    }
    parent = parent.parentPath
  }
}

const createCheckAsyncTime = (t: any, state: any) => {
  return t.awaitExpression(
    t.callExpression(
      t.memberExpression(state.runtimeInstanceIdentifier, t.identifier('checkAsync')), []
    )
  )
}

const createCheckSyncTime = (t: any, state: any) => {
  return t.callExpression(
    t.memberExpression(state.runtimeInstanceIdentifier, t.identifier('checkSync')), []
  )
}

const handleLoop = (t: any, path: any, state: any, timeout: number) => {
  const fnNode = getParentFunctionNode(t, path)
  const controlCheck = fnNode.async ? createCheckAsyncTime(t, state) : createCheckSyncTime(t, state)
  let body = path.node.body
  if (!t.isBlockStatement(body)) {
    path.node.body = t.blockStatement([t.cloneDeep(body)])
  }
  path.node.body.body.unshift(controlCheck)
}

const screateSourceProcessorPlugin = (timeout: number) => {
  return ({ types: t }: { types: any }) => {
    return {
      visitor: {
        FunctionDeclaration: (path: any) => {
          throw path.buildCodeFrameError('Expected ArrowFunction')
        },
        FunctionExpression: (path: any) => {
          throw path.buildCodeFrameError('Expected ArrowFunction')
        },

        ForStatement: (path: any, state: any) => handleLoop(t, path, state, timeout),
        WhileStatement: (path: any, state: any) => handleLoop(t, path, state, timeout),
        DoWhileStatement: (path: any, state: any) => handleLoop(t, path, state, timeout),

        ArrowFunctionExpression: (path: any, state: any) => {
          if (!path.isTopLevel) {
            const fnNode = getParentFunctionNode(t, path)
            const controlCheck = fnNode.async ? createCheckAsyncTime(t, state) : createCheckSyncTime(t, state)
            let body = path.node.body
            if (t.isExpression(body)) {
              path.node.body = t.blockStatement([
                t.returnStatement(t.cloneDeep(body))
              ])
            }
            path.node.body.body.unshift(controlCheck)
          }
        },

        TryStatement: (path: any, state: any) => {
          const fnNode = getParentFunctionNode(t, path)
          const controlCheck = fnNode.async ? createCheckAsyncTime(t, state) : createCheckSyncTime(t, state)
          path.node.handler.body.body.unshift(controlCheck)
          path.node.finalizer.body.unshift(controlCheck)
        },

        Program: (path: any, state: any) => {
          const functionPath = path.get('body.0.expression')
          if (
            path.node.body.length === 1
            && t.isArrowFunctionExpression(functionPath)
            && functionPath.node.async
          ) {
            functionPath.isTopLevel = true
            state.runtimeInstanceIdentifier = functionPath.scope.generateUidIdentifier('r')
            const timeControlAssignment = t.assignmentExpression(
              '=',
              state.runtimeInstanceIdentifier,
              t.callExpression(t.identifier('createFunctionRuntime'), [])
            )
            functionPath.scope.push(t.declareVariable(state.runtimeInstanceIdentifier))
            functionPath.node.body.body.unshift(t.expressionStatement(timeControlAssignment))
          } else {
            throw path.buildCodeFrameError('Expected AsyncArrowFunctionExpression');
          }
        },
      }
    }
  }
}
