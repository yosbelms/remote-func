import crypto from 'crypto'
import { hashMap as sharedHashMap } from './util'
const packageJson = require('../package.json')

const defaultTestRegex = /\.(js|mjs|jsx|ts|tsx)$/
const funcIdentifier = 'func'
const moduleName: string = packageJson.name

const refersToModule = (name: string) => {
  return name === moduleName || name.startsWith(`${moduleName}/`)
}

const filenamePassTest = (regex: RegExp, filename: string) => {
  return filename && regex.test(filename)
}

const sha1 = (txt: string) => {
  return (crypto
    .createHash('sha1')
    .update(txt)
    .digest('hex')
  )
}

const defaultTypescriptTranspile = (source: string) => {
  try {
    const ts = require('typescript')
    const transpileOutput = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2017,
      }
    })
    return transpileOutput.outputText
  } catch (e) {
    throw new Error(`${__filename}: ${e.stack}`)
  }
}

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
        const filename = file.opts.filename
        const {
          transpile = defaultTypescriptTranspile,
          test = defaultTestRegex,
          hashSource,
          hashMap = sharedHashMap,
        } = state.opts

        if (!filenamePassTest(test, filename)) return
        const calleePath = path.get('callee')
        if (calleePath.node.name === funcIdentifier) {
          const firstArgPath = path.get('arguments.0')

          if (t.isFunctionExpression(firstArgPath) || t.isArrowFunctionExpression(firstArgPath)) {
            const source = firstArgPath.getSource()
            const transpiled = transpile(source).trim()

            let sourceOutput = hashSource ? sha1(transpiled) : transpiled
            if (hashMap) {
              hashMap.set(sourceOutput, transpiled)
            }

            // transform
            firstArgPath.replaceWith(t.stringLiteral(sourceOutput))
          }
        }
      }
    }
  }
}
