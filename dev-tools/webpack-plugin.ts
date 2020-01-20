import { Compiler } from 'webpack'
import fs from 'fs'
import path from 'path'
import makeDir from 'make-dir'
import { importApiModuleDts } from './import-api-dts'

const pluginName = 'RemoteFuncWebpackPlugin'

interface ApiConfig {
  sourcePath: string
  destinationDir: string
}

interface PluginConfig {
  hashMapPath?: string
  apis?: ApiConfig[]
}

export default class WebpackPlugin {
  config: PluginConfig

  constructor(config: PluginConfig = {}) {
    this.config = {
      apis: [],
      ...config
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.beforeRun.tapPromise(pluginName, async () => {
      const apis = this.config.apis as ApiConfig[]
      for (const api of apis) {
        await importApiModuleDts(api.sourcePath, api.destinationDir)
      }
    })
  }
}

module.exports = WebpackPlugin
