import fs from 'fs'
import * as babel from '@babel/core'
import { createWatchdogPlugin } from './watchdog-plugin'
import { createSubsetPlugin } from './subset-plugin'
import { extractTypes } from './types-extractor'

const jsSubsetTypes = fs.readFileSync(__dirname + '/javascript-subset.txt', 'utf-8')
const nodeTypesWhitelist = extractTypes(jsSubsetTypes)

export const transform = (src: string, timeout: number = 1000) => {
  const watchdogPlugin = createWatchdogPlugin(timeout)
  const subsetPlugin = createSubsetPlugin(nodeTypesWhitelist)

  const out = babel.transform(src, {
    plugins: [
      subsetPlugin,
      watchdogPlugin,
    ]
  })

  return out
}
