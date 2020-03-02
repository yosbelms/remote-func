import fs from 'fs'
import { Script } from 'vm'
import { extractTypes } from './types-extractor'
import { createRuntime } from './runtime'
import { compile } from './compiler'
import { isValidIdentifier } from './util'
import { readOnly, getConsole, readOnlyTraps } from '../server/util'

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

const publicObjectStaticPropsMap = new Map([
  ['keys', true],
  ['values', true],
  ['hasOwnProperty', true],
  ['fromEntries', true],
  ['assign', true],
  ['create', true],
])

const objectTraps = {
  get(target: any, prop: any, receiver: any) {
    return (publicObjectStaticPropsMap.has(prop)
      ? readOnlyTraps.get(target, prop, receiver)
      : void 0
    )
  }
}

const readOnlyNatives = {
  console: readOnly(getConsole()),

  Object: readOnly(Object, objectTraps),
  Promise: readOnly(Promise),
  Date: readOnly(Date),
  Array: readOnly(Array),
  Number: readOnly(Number),
  String: readOnly(String),

  // errors
  Error: readOnly(Error),
  EvalError: readOnly(EvalError),
  RangeError: readOnly(RangeError),
  ReferenceError: readOnly(ReferenceError),
  SyntaxError: readOnly(SyntaxError),
  TypeError: readOnly(TypeError),
  URIError: readOnly(URIError),
}

const readOnlyNativesNames = Object.keys(readOnlyNatives)

export const createFuntainer = (config: Partial<FuntainerConfig> = {}): Funtainer => {
  const {
    timeout = defaultTimeout,
    memoryLimit = defaultMemoryLimit,
    source = '',
    filename = 'funtainer:file',
  } = config

  let { globalNames = [] } = config

  globalNames = Array.from(new Set([...readOnlyNativesNames, ...globalNames]))
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
    const _globals = globals || {}
    return (fn
      .call(null, { ...readOnlyNatives, ..._globals })
      .apply(null, args || [])
    )
  }

  contained.source = transformedCode
  return contained
}
