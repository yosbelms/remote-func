import * as babel from '@babel/core'

export const extractTypes = (src: string) => {
  const typesList: any[] = []
  babel.transform(src, {
    plugins: [hitPlugin(typesList)]
  })
  return Array.from(new Set(typesList))
}

const hitPlugin = (typesList: string[] = []) => {
  return ({ types: t }: { types: any }) => {
    // slice because babel throws an strange error here related to symbols
    const babelTypes = t.TYPES.slice(0, t.TYPES.length - 10)
    const deprecatedTypes = t.DEPRECATED_KEYS
    const visitor = babelTypes.reduce((visitor: any, _type: string) => {
      if (typeof _type === 'string' && !deprecatedTypes[_type]) {
        visitor[_type] = () => {
          typesList.push(_type)
        }
      }
      return visitor
    }, {})

    return {
      visitor,
    }
  }
}