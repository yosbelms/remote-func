#!/usr/bin/env node
import { extractDts } from '../dev-tools/extract-dts'
import fs from 'fs'
const mri = require('mri')
const opts = mri(process.argv.slice(2))

if (opts['extract-dts']) {
  const { source, out } = opts
  if (!source) throw new Error(`--source is mandatory`)
  if (!out) throw new Error(`--out is mandatory`)
  if (!fs.existsSync(source)) throw new Error(`${source} does not exists`)
  extractDts(source, out)
}
