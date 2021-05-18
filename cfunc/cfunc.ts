import fs from 'fs'
import { Script } from 'vm'
import { extractTypes } from './types-extractor'
import { createRuntime } from './runtime'
import { compile } from './compiler'
import { isValidIdentifier, createGetTrap } from './util'
import { readOnly, getConsole } from '../server/util'
import endent from 'endent'

const defaultTimeout = 1 * 1000 * 60 // 1min
const defaultMemoryLimit = 500 * 1024 * 1024 // 5Mb
const baseLanguageSubset = '()=>{};async()=>{};'
const languageSubset = fs.readFileSync(__dirname + '/javascript-subset.txt', 'utf-8')
const allowedNodeTypes = extractTypes(baseLanguageSubset + languageSubset)
const reserverGlobalIdentifiers = [
  'createRuntime',
  '__globals'
]

interface CfuncConfig {
  globalNames: string[]
  timeout: number
  memoryLimit: number
  source: string
  filename: string
}

export interface Cfunc {
  (args?: any[], globals?: { [k: string]: any }): any
  source: string
}

const readOnlyNatives = {
  console: readOnly(getConsole(), createGetTrap([
    'log',
    'error',
    'warn',
  ])),

  Object: readOnly(Object, createGetTrap([
    'keys',
    'values',
    'hasOwnProperty',
    'fromEntries',
    'assign',
    'create',
  ])),

  Promise: readOnly(Promise, createGetTrap([
    'all',
    'race',
    'resolve',
    'reject',
    'allSettled',
  ])),

  Date: readOnly(Date, createGetTrap([
    'now',
    'parse',
    'UTC',
  ])),

  Array: readOnly(Array, createGetTrap([
    'isArray',
    'from',
    'of',
  ])),

  Number: readOnly(Number, createGetTrap([
    'isFinite',
    'isInteger',
    'isNaN',
    'isSafeInteger',
    'parseFloat',
    'parseInt',
    'MAX_VALUE',
    'MIN_VALUE',
    'NaN',
    'NEGATIVE_INFINITY',
    'POSITIVE_INFINITY',
    'MAX_SAFE_INTEGER',
    'MIN_SAFE_INTEGER',
    'EPSILON',
  ])),

  String: readOnly(String, createGetTrap([
    'fromCharCode',
    'fromCodePoint',
    'raw',
  ])),

  // errors
  Error: readOnly(Error, createGetTrap([])),
  EvalError: readOnly(EvalError, createGetTrap([])),
  RangeError: readOnly(RangeError, createGetTrap([])),
  ReferenceError: readOnly(ReferenceError, createGetTrap([])),
  SyntaxError: readOnly(SyntaxError, createGetTrap([])),
  TypeError: readOnly(TypeError, createGetTrap([])),
  URIError: readOnly(URIError, createGetTrap([])),
}

const readOnlyNativesNames = Object.keys(readOnlyNatives)

export const createCfunc = (config: Partial<CfuncConfig> = {}): Cfunc => {
  const {
    timeout = defaultTimeout,
    memoryLimit = defaultMemoryLimit,
    source = '',
    filename = 'cfunc:file',
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
  const resetContext = endent`const {
    ${globalNames.join(',\n')}
  } = ${__globals};`

  const transformedCode = endent`exports.default = (${__globals}) => {
    ${resetContext}
    ${__globals} = void 0;

    ${`return ${code}`}
  }`

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
  // evaluate js code
  script.runInNewContext(vmCtx, {
    displayErrors: true,
    timeout: timeout,
    breakOnSigint: true,
  })

  // get the exported function, and create the wrapper
  const fn = vmCtx.exports.default
  const contained: Cfunc = (
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
