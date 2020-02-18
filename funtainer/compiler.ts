import * as babel from '@babel/core'
import { createRuntimePlugin } from './plugin-runtime'
import { createSubsetPlugin } from './plugin-subset'
import { createGlobalsPlugin } from './plugin-globals'

export const compile = (
  src: string,
  allowedNodeTypes: string[] = [],
  allowedGlobals: string[] = [],
) => {
  const runtimePlugin = createRuntimePlugin()
  const subsetPlugin = createSubsetPlugin(allowedNodeTypes)
  const globalsPlugin = createGlobalsPlugin(allowedGlobals)

  const out = babel.transform(src, {
    plugins: [
      subsetPlugin,
      globalsPlugin,
      runtimePlugin,
    ]
  }) || {}

  return out
}
