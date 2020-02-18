
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

const handleLoop = (t: any, path: any, state: any) => {
  const fnNode = getParentFunctionNode(t, path)
  const controlCheck = fnNode.async ? createCheckAsyncTime(t, state) : createCheckSyncTime(t, state)
  let body = path.node.body
  if (!t.isBlockStatement(body)) {
    path.node.body = t.blockStatement([t.cloneDeep(body)])
  }
  path.node.body.body.unshift(controlCheck)
}

export const createRuntimePlugin = () => {
  return ({ types: t }: { types: any }) => {
    return {
      visitor: {
        ObjectExpression: (path: any, state: any) => {
          if (path.parent.isRuntimeCall) return
          const node = path.node
          const allocExpr = t.callExpression(
            t.memberExpression(
              state.runtimeInstanceIdentifier,
              t.identifier('createObj')), [node]
          )
          allocExpr.isRuntimeCall = true
          path.replaceWith(allocExpr)
        },

        ArrayExpression: (path: any, state: any) => {
          if (path.parent.isRuntimeCall) return
          const node = path.node
          const allocExpr = t.callExpression(
            t.memberExpression(
              state.runtimeInstanceIdentifier,
              t.identifier('createArr')), [node]
          )
          allocExpr.isRuntimeCall = true
          path.replaceWith(allocExpr)
        },

        ObjectPattern: (path: any, state: any) => {
          path.node.properties.forEach((prop: any) => {
            if (prop.computed) {
              const destructKey = t.callExpression(
                t.memberExpression(
                  state.runtimeInstanceIdentifier,
                  t.identifier('computedProp')), [prop.key]
              )
              destructKey.isRuntimeCall = true
              prop.key = destructKey
            } else {
              // check props var names here
            }
          })
        },

        ObjectProperty: (path: any, state: any) => {
          const prop = path.node
          if (prop.computed) {
            const destructKey = t.callExpression(
              t.memberExpression(
                state.runtimeInstanceIdentifier,
                t.identifier('computedProp')), [prop.key]
            )
            destructKey.isRuntimeCall = true
            prop.key = destructKey
          } else {
            // check for var names here
          }
        },

        NewExpression: (path: any, state: any) => {
          if (path.parent.isRuntimeCall) return
          const node = path.node
          const allocExpr = t.callExpression(
            t.memberExpression(
              state.runtimeInstanceIdentifier,
              t.identifier('createObj')), [node]
          )
          allocExpr.isRuntimeCall = true
          path.replaceWith(allocExpr)
        },

        // member, getProp, setProp
        MemberExpression: (path: any, state: any) => {
          let { object, property } = path.node
          if (object === state.runtimeInstanceIdentifier) return

          if (!path.node.computed) {
            property = t.stringLiteral(property.name)
            // check for prop names here
          }

          if (t.isAssignmentExpression(path.parent)) {
            const { left, right } = path.parentPath.node
            if (left === path.node) {
              const operator = path.parent.operator
              const setPropExpr = t.callExpression(
                t.memberExpression(
                  state.runtimeInstanceIdentifier,
                  t.identifier('setProp')
                ),
                [object, property, right, t.stringLiteral(operator)]
              )
              setPropExpr.isRuntimeCall = true
              path.parentPath.replaceWith(setPropExpr)
              return
            }
          } else if (t.isCallExpression(path.parent) && !path.parent.isRuntimeCall) {
            const args = path.parent.arguments
            const callProp = t.callExpression(
              t.memberExpression(
                state.runtimeInstanceIdentifier,
                t.identifier('callProp')
              ),
              [object, property, ...args]
            )
            callProp.isRuntimeCall = true
            path.parentPath.replaceWith(callProp)
            return
          }

          const getPropExpr = t.callExpression(
            t.memberExpression(
              state.runtimeInstanceIdentifier,
              t.identifier('getProp')
            ),
            [object, property]
          )
          getPropExpr.isRuntimeCall = true
          path.replaceWith(getPropExpr)
        },

        // time checks
        ForStatement: (path: any, state: any) => handleLoop(t, path, state),
        WhileStatement: (path: any, state: any) => handleLoop(t, path, state),
        DoWhileStatement: (path: any, state: any) => handleLoop(t, path, state),

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

        // program setup
        Program: (path: any, state: any) => {
          const functionPath = path.get('body.0.expression')
          if (
            path.node.body.length === 1
            && t.isArrowFunctionExpression(functionPath)
            && functionPath.node.async
          ) {
            functionPath.isTopLevel = true
            state.runtimeInstanceIdentifier = functionPath.scope.generateUidIdentifier('r')
            const runtimeAssignment = t.assignmentExpression(
              '=',
              state.runtimeInstanceIdentifier,
              t.callExpression(t.identifier('createRuntime'), [])
            )
            functionPath.scope.push(t.declareVariable(state.runtimeInstanceIdentifier))
            functionPath.node.body.body.unshift(t.expressionStatement(runtimeAssignment))
          } else {
            throw path.buildCodeFrameError('Expected AsyncArrowFunctionExpression');
          }
        },
      }
    }
  }
}
