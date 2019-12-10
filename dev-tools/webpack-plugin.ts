import { Compiler } from 'webpack'
import fs from 'fs'
import path from 'path'
import makeDir from 'make-dir'
import { importApiModule } from './import-api'
import { hashMap, mapToJson } from './util'

const pluginName = 'RemoteFuncWebpackPlugin'

interface ApiConfig {
  sourcePath: string
  destinationDir: string
}

interface PluginConfig {
  hashMapPath?: string
  apis?: ApiConfig[]
}

class WebpackPlugin {
  config: PluginConfig

  constructor(config: PluginConfig = {}) {
    this.config = {
      apis: [],
      ...config
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.beforeCompile.tap(pluginName, () => {
      hashMap.clear()
    })

    compiler.hooks.afterCompile.tap(pluginName, () => {
      const { hashMapPath } = this.config
      if (hashMapPath) {
        makeDir(path.dirname(path.resolve(hashMapPath))).then(() => {
          fs.writeFileSync(hashMapPath, mapToJson(hashMap))
        })
      }
    })

    compiler.hooks.beforeRun.tapPromise(pluginName, async () => {
      const apis = this.config.apis as ApiConfig[]
      for (const api of apis) {
        await importApiModule(api.sourcePath, api.destinationDir)
      }
    })
  }
}

module.exports = WebpackPlugin
