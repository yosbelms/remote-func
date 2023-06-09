#!/usr/bin/env node
import { extractDts } from '../dev-tools/extract-dts'
import fs from 'fs'
import sade from 'sade'
const pkg = require('../package.json')

const prog = sade('remote-func')

prog
  .version(pkg.version)

prog
  .command('extract-dts')
  .describe('Extract .dts files and .js stub')
  .option('-s, --source', 'Source file name')
  .option('-o, --out', 'Output directory')
  .option('-tsconf, --tscConfig', 'Typescript compiler config file location')
  .example('export-dts --source my-api.js --out ./dts-api-dir')
  .action((opts) => {
    const { source, out, tscConfig } = opts
    if (!source) throw new Error(`--source is mandatory`)
    if (!out) throw new Error(`--out is mandatory`)
    if (!fs.existsSync(source)) throw new Error(`${source} does not exists`)
    let tsconf: any = {}
    if (tscConfig) {
      tsconf = JSON.parse(fs.readFileSync(tscConfig).toString())
    }
    extractDts(source, out, tsconf)
  })

prog.parse(process.argv)
