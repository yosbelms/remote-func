import terser from 'terser'
const packageJson = require('../package.json')

const defaultTestRegex = /\.(js|mjs|jsx|ts|tsx)$/
const funcIdentifier = 'func'
const moduleName: string = packageJson.name

const isProduction = () => {
  const { BABEL_ENV, NODE_ENV } = process.env
  const p = 'production'
  return BABEL_ENV === p || NODE_ENV === p
}

const refersToModule = (name: string) => {
  return name === moduleName || name.startsWith(`${moduleName}/`)
}

const filenamePassTest = (regex: RegExp, filename: string) => {
  return filename && regex.test(filename)
}

const identity = (a: any) => a

const defaultTypescriptTranspile = (source: string) => {
  try {
    let ts
    try {
      ts = require('typescript')
    } catch (_) {
      throw new Error('Please add TypeScript as dependency')
    }
    const transpileOutput = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2017,
      }
    })
    return transpileOutput.outputText
  } catch (e) {
    throw new Error(`${__filename}: ${(e as Error).stack}`)
  }
}

/**
Options:
  - test: file path test regex, default /\.(js|mjs|jsx|ts|tsx)$/
  - transpile: transpilation function, default TypeScript
  - trasform: receive the final code right before write, the transpiled code
              will be replaced by the returning value.

Example usage with Babel:

"plugins": [
  "remote-func/dev-tools/babel-plugin"
]

"plugins": [
  ["remote-func/dev-tools/babel-plugin", {
    test: /regex/,
    transpile: () => {},
    transform: () => {},
    minify: true,
  }]
]

 */

export default ({ types: t }: { types: any }) => {
  return {
    visitor: {
      ImportSpecifier: (path: any, state: any) => {
        if (path.node.imported.name === funcIdentifier) {
          if (refersToModule(path.parent.source.value)) {
            state.$funcIsImported = true
          } else {
            state.$funcIsImported = false
          }
        }
      },

      CallExpression: (path: any, state: any) => {
        if (!state.$funcIsImported) return

        const file = state.file
        const { filename = '', root = '' } = file.opts
        const {
          transpile = defaultTypescriptTranspile,
          test = defaultTestRegex,
          transform = identity,
          minify = true,
        } = state.opts

        if (!filenamePassTest(test, filename)) return
        const calleePath = path.get('callee')

        if (calleePath.node.name === funcIdentifier) {
          const relativeFilename = filename ? filename.substring(root?.length || 0) : ''
          const location = path.node.loc?.start ?? {}

          const newArgs = path.node.arguments.map((argNode: any, pos: number) => {
            const argNodePath = path.get('arguments.' + pos)
            if (t.isFunctionExpression(argNodePath) || t.isArrowFunctionExpression(argNodePath)) {
              const source = argNodePath.getSource()
              let sourceOutput: string = transpile(source).trim()

              if (isProduction() && minify) {
                // because terser doesn't compiles when the input code is  async () => ...
                // so we add a prefix and remove after minify
                sourceOutput = `x=${sourceOutput}`
                sourceOutput = String(terser.minify(sourceOutput).code)
                sourceOutput = sourceOutput.substring(sourceOutput.indexOf('=') + 1)
              }

              // transform
              sourceOutput = transform(sourceOutput)
              return t.stringLiteral(sourceOutput)
            }

            return t.cloneNode(argNodePath.node)
          })

          path.replaceWith(t.callExpression(t.identifier(calleePath.node.name), [
            ...newArgs,
            t.stringLiteral(`${relativeFilename}:${location.line}:${location.column}`)
          ]))

          path.skip()
        }
      }
    }
  }
}
