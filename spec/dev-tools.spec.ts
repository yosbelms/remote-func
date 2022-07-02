import 'jasmine'
import * as babel from '@babel/core'
import babelDevTransformPlugin from '../dev-tools/babel-plugin'

describe('dev tools', () => {
  it('should add sourceLoc', async () => {
    const src = `
      import { func } from 'remote-func/client'
      const findTitlesByPublisher = func(obj, async (title) => {
        const allBooks = await books.getAll()
        return allBooks
          .filter(book => book.publisher == title)
          .map(book => book.title)
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

    expect(String(out?.code).indexOf('/myfile.ts')).toBeGreaterThan(0)
    expect(String(out?.code).indexOf('line: 3')).toBeGreaterThan(0)
    expect(String(out?.code).indexOf('column: 36')).toBeGreaterThan(0)
  })
})
