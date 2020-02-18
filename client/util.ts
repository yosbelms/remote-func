import { RemoteFunction } from './func'

export const funcUrl = <T>(url: string, rf: T): Function => {
  const source = (rf as unknown as RemoteFunction).source
  const result = (...args: any[]) => {
    let urlParam = ''
    let hasQuestionChar = url.indexOf('?') !== -1
    let lastChar = url.charAt(url.length - 1)

    if (lastChar === '?' || lastChar === '&') {
      urlParam = 'requests='
    } else if (!hasQuestionChar) {
      urlParam = '?requests='
    }

    return url + urlParam + encodeURIComponent(JSON.stringify({ source, args }))
  }
  return result as Function
} 