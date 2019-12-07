import crypto from 'crypto'
import { hashMap as sharedHashMap } from './util'

const defaultTestRegex = /\.(js|mjs|jsx|ts|tsx)$/

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
      CallExpression: (path: any, state: any) => {
        const file = state.file
        const filename = file.opts.filename
        const {
          transpile = defaultTypescriptTranspile,
          test = defaultTestRegex,
          hashSource,
          hashMap = sharedHashMap,
        } = state.opts

        if (!filenamePassTest(test, filename)) return

        const fnTagName = '$func'
        const calleePath = path.get('callee')
        if (fnTagName === calleePath.node.name) {
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

            // calleePath.replaceWith(t.memberExpression(
            //   t.cloneDeep(calleePath.node),
            //   t.identifier('_compiled')
            // ))
          }
        }
      }
    }
  }
}
