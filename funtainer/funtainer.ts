import fs from 'fs'
import { Script } from 'vm'
import { extractTypes } from './types-extractor'
import { createRuntime } from './runtime'
import { compile } from './compiler'
import { isValidIdentifier } from './util'

const defaultTimeout = 1 * 1000 * 60 // 1min
const defaultMemoryLimit = 500 * 1024 * 1024 // 5Mb
const baseLanguageSubset = '()=>{};async()=>{};'
const languageSubset = fs.readFileSync(__dirname + '/javascript-subset.txt', 'utf-8')
const allowedNodeTypes = extractTypes(baseLanguageSubset + languageSubset)
const reserverGlobalIdentifiers = [
  'createRuntime',
  '__globals'
]

interface FuntainerConfig {
  globalNames: string[]
  timeout: number
  memoryLimit: number
  source: string
  filename: string
}

export interface Funtainer {
  (args?: any[], globals?: { [k: string]: any }): any
  source: string
}

export const createFuntainer = (config: Partial<FuntainerConfig> = {}): Funtainer => {
  const {
    globalNames = [],
    timeout = defaultTimeout,
    memoryLimit = defaultMemoryLimit,
    source = '',
    filename = 'funtainer:file',
  } = config

  globalNames.forEach((name) => {
    if (!isValidIdentifier(name)) {
      throw new Error(`Invalid identifier '${name}'`)
    }
    if (reserverGlobalIdentifiers.indexOf(name) !== -1) {
      throw new Error(`Reserved identifier '${name}'`)
    }
  })

  const { code = '' } = compile(source, allowedNodeTypes, globalNames)
  const __globals = '__globals'
  const resetContext = `const {${globalNames.join(', ')}} = ${__globals};`

  const transformedCode = `exports.default = (${__globals}) => {
${resetContext} ${__globals} = void 0;
return ${code}}`

  const script = new Script(transformedCode, {
    filename,
  })

  const vmCtx = {
    createRuntime: () => {
      return createRuntime({
        timeout,
        memoryLimit,
      })
    },
    exports: Object.create(null),
  }

  script.runInNewContext(vmCtx, {
    displayErrors: true,
    timeout: timeout,
    breakOnSigint: true,
  })

  const fn = vmCtx.exports.default
  const contained: Funtainer = (
    args?: any[],
    globals?: { [k: string]: any },
  ) => {
    return (fn
      .call(null, globals || {})
      .apply(null, args || [])
    )
  }

  contained.source = transformedCode
  return contained
}
