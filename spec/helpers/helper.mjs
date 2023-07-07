import { register } from 'ts-node'
import path from 'path'
register({
  project: path.resolve('tsconfig.json')
})