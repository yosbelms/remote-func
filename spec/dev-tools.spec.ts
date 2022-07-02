import 'jasmine'
import * as babel from '@babel/core'
import babelDevTransformPlugin from '../dev-tools/babel-plugin'

describe('dev tools', () => {
  it('should add sourceLoc', async () => {
    const src = `
      import { func } from 'remote-func/client'
      const findTitlesByPublisher = func(obj, async (title) => {
        const x = 1
      })
    `

    const out = babel.transform(src, {
      highlightCode: false,
      root: '/project/',
      filename: '/project/dir/myfile.ts',
      plugins: [
        babelDevTransformPlugin,
      ]
    })

    expect(String(out?.code).indexOf('/myfile.ts:3:36')).toBeGreaterThan(0)
  })
})
