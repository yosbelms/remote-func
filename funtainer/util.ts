// https://www.mattzeunert.com/2016/07/24/javascript-array-object-sizes.html
// Though, those sizes represents the worst case

export const sizeOf = (obj: any) => {
  let bytes = 2
  if (obj === null || obj === void 0) {
    bytes += 6
  } else {
    switch (typeof obj) {
      case 'string':
        bytes += obj.length * 2
        break
      case 'number':
        bytes += 8
        break
      case 'boolean':
        bytes += 8
        break
      case 'function':
      case 'object':
        const objClass = Object.prototype.toString.call(obj).slice(8, -1)
        switch (objClass) {
          case 'Object':
          case 'Array':
          case 'Function':
            bytes += 64
            for (let key in obj) {
              if (obj.hasOwnProperty(key)) {
                bytes += sizeOf(obj[key]) + sizeOf(key)
              }
            }
            if (objClass !== 'Function') {
              break
            }
          default:
            bytes += sizeOf(obj.toString())
        }
        break
    }
  }
  return bytes
}

const protectedProperty = new Map([
  'prototype',
  ...Object.getOwnPropertyNames(Object.prototype),
].map(k => [k, void 0]))

export const isProtectedProperty = (prop: string) => protectedProperty.has(prop)

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const identRegex = /^[$A-Z_][0-9A-Z_$]*$/i
export const isValidIdentifier = (name: string) => identRegex.test(name)
